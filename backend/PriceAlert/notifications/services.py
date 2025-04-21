from django.utils import timezone
from products.models import UserProduct, ProductOnECSite, PriceHistory
from users.models import User
from .models import Notification, EmailFrequency
import logging
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
logger = logging.getLogger(__name__)

class NotificationService:
    """
    通知サービスクラス
    商品の価格変動を監視して、条件を満たした場合に通知を生成する
    """
    
    @staticmethod
    def check_price_alerts():
        """
        アラート条件をチェックして通知が必要な場合は通知を作成する
        """
        logger.info("価格アラートチェック開始")
        
        # 通知有効なユーザー商品を取得
        user_products = UserProduct.objects.filter(notification_enabled=True)
        notification_count = 0
        
        for user_product in user_products:
            try:
                
                # 閾値タイプ（実売価格か表示価格か）に基づいて現在価格を取得
                if user_product.threshold_type == 'list_price':
                    price_type = 'current_price'
                else:
                    price_type = 'effective_price'

                # 最安値のEC商品を取得
                product_on_ec_site = ProductOnECSite.objects.filter(
                    product=user_product.product, 
                    is_active=True
                ).order_by(f'{price_type}').first()
                
                # 直近の価格履歴を取得
                last_price_history = PriceHistory.objects.filter(
                    product_on_ec_site=product_on_ec_site
                ).order_by('-captured_at').first()
                
                if not last_price_history:
                    continue
                
                # 通知条件をチェックして通知を作成
                notification_created = NotificationService._check_and_create_notification(
                    user_product, product_on_ec_site, last_price_history
                )
                
                if notification_created:
                    notification_count += 1
            
            except Exception as e:
                logger.error(f"価格アラートチェック中にエラーが発生しました: {str(e)}", exc_info=True)
        
        logger.info(f"価格アラートチェック完了: {notification_count}件の通知を作成しました")
        return notification_count
    
    @staticmethod
    def _check_and_create_notification(user_product, product_on_ec_site, price_history):
        """
        通知条件をチェックして条件を満たす場合は通知を作成する
        """
        # 閾値タイプ（実売価格か表示価格か）に基づいて現在価格を取得
        if user_product.threshold_type == 'list_price':
            current_price = product_on_ec_site.current_price
        else:
            current_price = product_on_ec_site.effective_price
        
        # 以前に送信した通知を取得
        previous_notifications = Notification.objects.filter(
            user=user_product.user,
            product=user_product.product,
            product_on_ec_site=product_on_ec_site
        ).order_by('-sent_at')
        
        previous_price = None
        if previous_notifications.exists():
            previous_price = previous_notifications.first().new_price
        
        # 通知が作成されたかどうかのフラグ
        notification_created = False
        
        # 閾値通知: 設定した価格以下になったら通知
        if user_product.price_threshold and current_price <= user_product.price_threshold:
            # 前回の通知価格と同じか高い場合は通知しない
            if previous_price is None or current_price < previous_price:
                NotificationService._create_price_threshold_notification(
                    user_product, product_on_ec_site, current_price, user_product.price_threshold
                )
                notification_created = True
        
        # 割合変動通知: 設定した割合以上値下がりした場合に通知
        elif user_product.threshold_percentage and previous_price:
            price_change = previous_price - current_price
            if price_change > 0:  # 値下がりの場合
                change_percentage = (price_change / previous_price) * 100
                if change_percentage >= user_product.threshold_percentage:
                    NotificationService._create_percentage_drop_notification(
                        user_product, product_on_ec_site, current_price, previous_price, change_percentage
                    )
                    notification_created = True
        
        return notification_created
    
    @staticmethod
    def _create_price_threshold_notification(user_product, product_on_ec_site, current_price, threshold):
        """
        閾値通知を作成する
        """
        product = user_product.product
        message = f"{product.name}の価格が設定した閾値（{threshold:,}円）を下回りました。現在価格: {current_price:,}円"
        
        Notification.objects.create(
            user=user_product.user,
            product=product,
            product_on_ec_site=product_on_ec_site,
            notification_type='price_threshold',
            message=message,
            new_price=current_price,
            is_read=False
        )
    
    @staticmethod
    def _create_percentage_drop_notification(user_product, product_on_ec_site, current_price, previous_price, percentage):
        """
        割合変動通知を作成する
        """
        product = user_product.product
        message = f"{product.name}の価格が{previous_price:,}円から{current_price:,}円に下がりました（{percentage:.1f}%値下がり）"
        
        Notification.objects.create(
            user=user_product.user,
            product=product,
            product_on_ec_site=product_on_ec_site,
            notification_type='percentage_drop',
            message=message,
            old_price=previous_price,
            new_price=current_price,
            is_read=False
        )
    
    @staticmethod
    def _create_price_drop_notification(user_product, product_on_ec_site, current_price, previous_price):
        """
        価格下落通知を作成する
        """
        product = user_product.product
        message = f"{product.name}の価格が{previous_price:,}円から{current_price:,}円に下がりました"
        
        Notification.objects.create(
            user=user_product.user,
            product=product,
            product_on_ec_site=product_on_ec_site,
            notification_type='price_drop',
            message=message,
            old_price=previous_price,
            new_price=current_price,
            is_read=False
        ) 


class EmailNotificationService:
    """
    メール通知サービスクラス
    通知をメールで送信する
    """   
    @staticmethod
    def send_price_alert_notification():
        """
        価格アラート通知をメールで送信する
        """
        logger.info("価格アラート通知をメールで送信します")
        send_mail_count = {}

        for email_frequency in EmailFrequency.objects.all():
            frequency = email_frequency.email_frequency
            
            # 前回通知からのインターバルをチェック
            if not EmailNotificationService._should_send_notification(email_frequency):
                send_mail_count[frequency] = "skip"
                continue

            # メール通知が有効かつ通知頻度がマッチするユーザーを取得
            users = User.objects.filter(
                settings__email_notifications=True,
                settings__email_frequency=email_frequency
            )
            
            if not users.exists():
                logger.debug(f"メール通知が有効なユーザーが見つかりません - frequency: {frequency}")
                email_frequency.sent_at = timezone.now()
                email_frequency.save()
                continue

            subject = f"【PriceAlert】{frequency}の価格変動レポート"
            template_name = f"price_alert_{frequency}"
            
            # 各ユーザーに通知メールを送信
            send_mail_count[frequency] = EmailNotificationService._process_user_notifications(
                users, subject, template_name
            )
            
            # 通知送信時刻を更新
            email_frequency.sent_at = timezone.now()
            email_frequency.save()

        return {"success": True, "message": f"メール送信が完了しました - 送信数: {send_mail_count}"}
    
    @staticmethod
    def _should_send_notification(email_frequency):
        """
        通知を送信すべきかどうかをチェック
        """
        if not email_frequency.sent_at:
            return True
            
        # Celeryのタスク実行時間を考慮して6時間の余裕を持たせる
        if timezone.now() - email_frequency.sent_at < timedelta(days=email_frequency.interval, hours=-6):
            logger.debug(f"前回通知からのインターバルが所定以下なので通知しません - frequency: {email_frequency.email_frequency}")
            return False
            
        return True
    
    @staticmethod
    def _process_user_notifications(users, subject, template_name):
        """
        ユーザーごとの通知処理
        """
        send_mail_count = 0
        
        for user in users:
            # 未送信の通知を取得
            notifications = Notification.objects.filter(
                user=user,
                product_on_ec_site__isnull=False,
                sent_at__isnull=True
            )
            
            if not notifications.exists():
                continue
                
            # メール送信
            result = EmailNotificationService._send_email(user, notifications, subject, template_name)
            if result.get('success'):
                send_mail_count += 1
                notifications.update(sent_at=timezone.now())
            else:
                logger.warning(f"メール送信に失敗しました - user: {user.email}, message: {result.get('message')}")
                
        return send_mail_count

    @staticmethod
    def _send_email(user, notifications, subject, template_name):
        """
        メール送信
        """
        try:
            context = {
                'user': user,
                'notifications': notifications,
                'notifications_count': notifications.count(),
                'period': '本日',
                'title': subject,
                'frontend_url': settings.FRONTEND_URL
            }

            # テンプレートをレンダリング
            html_message = render_to_string(f'emails/{template_name}.html', context)
            text_message = strip_tags(html_message)
            
            # メール送信
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message
            )

            return {"success": True, "message": "メール送信が完了しました"}
        except Exception as e:
            return {"success": False, "message": str(e)}

