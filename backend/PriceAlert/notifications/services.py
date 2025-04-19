from django.utils import timezone
from django.conf import settings
from django.db.models import F, Q
from products.models import UserProduct, ProductOnECSite, PriceHistory
from .models import Alert, Notification
import logging

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
                # ユーザーの閾値タイプに基づいてEC商品を取得
                product = user_product.product
                product_on_ec_sites = ProductOnECSite.objects.filter(
                    product=product, 
                    is_active=True
                ).exclude(current_price=None)
                
                for product_on_ec_site in product_on_ec_sites:
                    # 直近の価格履歴を取得
                    last_price_history = PriceHistory.objects.filter(
                        product_on_ec_site=product_on_ec_site
                    ).order_by('-captured_at').first()
                    
                    if not last_price_history:
                        continue
                    
                    # 通知条件をチェック
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