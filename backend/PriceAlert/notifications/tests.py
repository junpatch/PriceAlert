from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from products.models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from .models import Alert, Notification
from .services import NotificationService
import datetime

User = get_user_model()

class NotificationModelTest(TestCase):
    """通知モデルのテスト"""
    
    def setUp(self):
        # テストユーザーの作成
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123'
        )
        
        # 商品の作成
        self.product = Product.objects.create(
            name='テスト商品',
            description='これはテスト商品です',
            manufacturer='テストメーカー',
            model_number='TEST-001'
        )
        
        # ECサイトの作成
        self.ec_site = ECSite.objects.create(
            name='テストショップ',
            code='test_shop'
        )
        
        # 商品とECサイトの紐付け
        self.product_on_ec_site = ProductOnECSite.objects.create(
            product=self.product,
            ec_site=self.ec_site,
            ec_product_id='12345',
            product_url='https://example.com/product/12345',
            current_price=10000,
            current_points=100,
            effective_price=9900
        )
        
        # ユーザー商品の作成
        self.user_product = UserProduct.objects.create(
            user=self.user,
            product=self.product,
            price_threshold=9500,
            notification_enabled=True
        )
        
        # アラートの作成
        self.alert = Alert.objects.create(
            user_product=self.user_product,
            alert_type='price_drop',
            threshold_value=9500,
            is_active=True
        )
        
    def test_notification_creation(self):
        """通知が正しく作成されるかテスト"""
        notification = Notification.objects.create(
            user=self.user,
            product=self.product,
            product_on_ec_site=self.product_on_ec_site,
            alert=self.alert,
            notification_type='price_drop',
            message='価格が下がりました',
            old_price=10000,
            new_price=9000,
            is_read=False
        )
        
        # 通知が正しく作成されたか確認
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.product, self.product)
        self.assertEqual(notification.notification_type, 'price_drop')
        self.assertEqual(notification.old_price, 10000)
        self.assertEqual(notification.new_price, 9000)
        self.assertFalse(notification.is_read)
        
        # 文字列表現が期待通りか
        expected_str = f"{self.user.username} - {self.product.name} - price_drop"
        self.assertEqual(str(notification), expected_str)

class NotificationServiceTest(TestCase):
    """通知サービスのテスト"""
    
    def setUp(self):
        # テストユーザーの作成
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123'
        )
        
        # 商品の作成
        self.product = Product.objects.create(
            name='テスト商品',
            description='これはテスト商品です',
            manufacturer='テストメーカー',
            model_number='TEST-001'
        )
        
        # ECサイトの作成
        self.ec_site = ECSite.objects.create(
            name='テストショップ',
            code='test_shop'
        )
        
        # 商品とECサイトの紐付け
        self.product_on_ec_site = ProductOnECSite.objects.create(
            product=self.product,
            ec_site=self.ec_site,
            ec_product_id='12345',
            product_url='https://example.com/product/12345',
            current_price=9000,  # 価格閾値より低い価格に設定
            current_points=100,
            effective_price=8900
        )
        
        # 価格履歴の作成
        self.price_history = PriceHistory.objects.create(
            product_on_ec_site=self.product_on_ec_site,
            price=9000,
            points=100,
            effective_price=8900,
            captured_at=timezone.now()
        )
        
        # ユーザー商品の作成 (価格閾値通知用)
        self.user_product = UserProduct.objects.create(
            user=self.user,
            product=self.product,
            price_threshold=9500,  # 現在価格より高い閾値
            notification_enabled=True
        )
    
    def test_price_threshold_notification(self):
        """価格閾値通知が正しく作成されるかテスト"""
        # 通知サービスの実行
        notification_count = NotificationService.check_price_alerts()
        
        # 通知が1件作成されたか確認
        self.assertEqual(notification_count, 1)
        
        # 通知内容の確認
        notification = Notification.objects.first()
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.product, self.product)
        self.assertEqual(notification.notification_type, 'price_threshold')
        self.assertEqual(notification.new_price, 9000)
        
        # 2回目の実行では既に通知済みなので新たな通知は作成されないはず
        notification_count = NotificationService.check_price_alerts()
        self.assertEqual(notification_count, 0)
        
    def test_percentage_drop_notification(self):
        """割合変動通知が正しく作成されるかテスト"""
        # 閾値を設定しない代わりに割合を設定
        self.user_product.price_threshold = None
        self.user_product.threshold_percentage = 10
        self.user_product.save()
        
        # 既存の通知を作成して価格履歴を作る（新価格が10%以上値下がりするように）
        Notification.objects.create(
            user=self.user,
            product=self.product,
            product_on_ec_site=self.product_on_ec_site,
            notification_type='price_drop',
            message='以前の価格変更',
            old_price=10000,  # 元の価格
            new_price=10000,  # 現在より高い価格
            is_read=False
        )
        
        # 通知サービスの実行
        notification_count = NotificationService.check_price_alerts()
        
        # 1件の通知が作成されたか確認
        self.assertEqual(notification_count, 1)
        
        # 最新の通知を取得
        notification = Notification.objects.latest('sent_at')
        
        # 通知の種類が正しいか確認
        self.assertEqual(notification.notification_type, 'percentage_drop')
        self.assertEqual(notification.old_price, 10000)
        self.assertEqual(notification.new_price, 9000)
