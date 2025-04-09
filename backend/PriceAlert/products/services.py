from django.utils import timezone
from django.db import transaction
from .models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from .connectors.amazon import AmazonConnector
from .connectors.rakuten import RakutenConnector
from .connectors.yahoo import YahooConnector

class ProductService:
    """商品関連のビジネスロジック"""
    
    def __init__(self,amazon_connector=None,rakuten_connector=None,yahoo_connector=None):
        self.amazon_connector = amazon_connector or AmazonConnector()
        self.rakuten_connector = rakuten_connector or RakutenConnector()
        self.yahoo_connector = yahoo_connector or YahooConnector()
    
    def register_product_from_url(self, user_id, url, price_threshold):
        """URLから商品を登録する"""
        # URLからECサイト種別を判定
        ec_site_code = self._identify_ec_site_from_url(url)
        
        # ECサイトをDBから取得（なければ作成）
        ec_site, _ = ECSite.objects.get_or_create(
            code=ec_site_code,
            defaults={
                'name': self._get_ec_site_name(ec_site_code)
            }
        )
        
        # コネクターを使用して商品情報を取得
        product_info = self._fetch_product_info(url, ec_site_code)
        
        # トランザクション開始（すべての処理を一括で行う）
        with transaction.atomic():
            # 商品をDBに保存（既存の場合は取得）
            product, created = Product.objects.update_or_create(
                jan_code=product_info.get('jan_code'),
                model_number=product_info.get('model_number'),
                defaults={
                    'name': product_info['name'],
                    'description': product_info.get('description'),
                    'image_url': product_info.get('image_url'),
                    'manufacturer': product_info.get('manufacturer')
                }
            )
            
            # ECサイト上の商品情報を保存
            product_on_ec_site, created = ProductOnECSite.objects.update_or_create(
                product=product,
                ec_site=ec_site,
                ec_product_id=product_info['ec_product_id'],
                defaults={
                    'product_url': product_info['product_url'],
                    'affiliate_url': product_info.get('affiliate_url'),
                    'current_price': product_info.get('price'),
                    'current_points': product_info.get('points', 0),
                    'effective_price': product_info.get('effective_price', product_info.get('price')),
                    'last_updated': timezone.now(),
                    'is_active': True
                }
            )
            
            # 価格履歴を保存
            if created or product_on_ec_site.current_price != product_info.get('price'):
                PriceHistory.objects.create(
                    product_on_ec_site=product_on_ec_site,
                    price=product_info.get('price'),
                    points=product_info.get('points', 0),
                    effective_price=product_info.get('effective_price', product_info.get('price')),
                    captured_at=timezone.now()
                )
            
            # ユーザーと商品を関連付け
            user_product, created = UserProduct.objects.get_or_create(
                user_id=user_id,
                product=product,
                defaults={
                    'notification_enabled': True,
                    'display_order': 0,
                    'price_threshold': price_threshold
                }
            )
            
        return {
            'user_product': user_product,
            'product': product,
            'product_on_ec_site': product_on_ec_site
        }
    
    def _identify_ec_site_from_url(self, url):
        """URLからECサイトコードを特定"""
        if 'amazon.co.jp' in url:
            return 'amazon'
        elif 'rakuten.co.jp' in url:
            return 'rakuten'
        elif 'yahoo' in url and 'shopping' in url:
            return 'yahoo'
        else:
            raise ValueError("対応していないECサイトのURLです")
    
    def _get_ec_site_name(self, code):
        """ECサイトコードから表示名を取得"""
        site_names = {
            'amazon': 'Amazon',
            'rakuten': '楽天市場',
            'yahoo': 'Yahoo!ショッピング'
        }
        return site_names.get(code, code.capitalize())
    
    def _fetch_product_info(self, url, ec_site_code):
        """ECサイトに応じたコネクターで商品情報を取得"""
        connector = self._get_connector(ec_site_code)
        return connector.fetch_product_info(url)
    
    def _get_connector(self, ec_site_code):
        connectors = {
            'amazon': self.amazon_connector,
            'rakuten': self.rakuten_connector,
            'yahoo': self.yahoo_connector,
        }
        connector = connectors.get(ec_site_code)
        if not connector:
            raise ValueError(f"{ec_site_code}のコネクターはサポートされていません")
        return connector
