import logging
from django.utils import timezone
from django.db import transaction
from .models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from .connectors.amazon import AmazonConnector
from .connectors.rakuten import RakutenConnector
from .connectors.yahoo import YahooConnector

logger = logging.getLogger('products')

class ProductService:
    """商品関連のビジネスロジック"""
    
    def __init__(self,amazon_connector=None,rakuten_connector=None,yahoo_connector=None):
        self.amazon_connector = amazon_connector or AmazonConnector()
        self.rakuten_connector = rakuten_connector or RakutenConnector()
        self.yahoo_connector = yahoo_connector or YahooConnector()
        logger.debug('ProductServiceを初期化しました - Amazon: %s, 楽天: %s, Yahoo: %s',
                    self.amazon_connector.__class__.__name__,
                    self.rakuten_connector.__class__.__name__,
                    self.yahoo_connector.__class__.__name__)
    
    def register_product_from_url(self, user_id, url, price_threshold):
        """URLから商品を登録する"""
        logger.info('商品登録を開始します - URL: %s..., ユーザーID: %s', url[:30], user_id)
        
        try:
            # URLからECサイト種別を判定
            ec_site_code = self._identify_ec_site_from_url(url)
            logger.debug('ECサイトを識別しました: %s', ec_site_code)
            
            # ECサイトをDBから取得（なければ作成）
            ec_site, created = ECSite.objects.get_or_create(
                code=ec_site_code,
                defaults={
                    'name': self._get_ec_site_name(ec_site_code)
                }
            )
            if created:
                logger.info('新規ECサイトを作成しました: %s', ec_site.name)
            
            # コネクターを使用して商品情報を取得
            product_info = self._fetch_product_info(url, ec_site_code)
            logger.debug('商品情報を取得しました: %s', product_info.get('name'))
            
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
                if created:
                    logger.info('新規商品を作成しました: %s...', product.name[:20])
                else:
                    logger.debug('既存商品を更新しました: %s...', product.name[:20])
                
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
                logger.debug('ECサイト上の商品情報を更新しました - URL: %s, 価格: %s円', 
                           product_on_ec_site.product_url, 
                           product_info.get('price'))
                
                # 価格履歴を保存
                if created or product_on_ec_site.current_price != product_info.get('price'):
                    price_history = PriceHistory.objects.create(
                        product_on_ec_site=product_on_ec_site,
                        price=product_info.get('price'),
                        points=product_info.get('points', 0),
                        effective_price=product_info.get('effective_price', product_info.get('price')),
                        captured_at=timezone.now()
                    )
                    logger.info('価格履歴を作成しました - 商品: %s..., 価格: %s円', 
                              product.name[:20], price_history.price)
                
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
                if created:
                    logger.info('ユーザーと商品を関連付けました - ユーザー: %s, 商品: %s...', 
                              user_id, product.name[:20])
            
            logger.info('商品登録が完了しました - URL: %s', url[:30])
            return {
                'user_product': user_product,
                'product': product,
                'product_on_ec_site': product_on_ec_site
            }
            
        except Exception as e:
            logger.error('商品登録中にエラーが発生しました - URL: %s, エラー: %s', url, str(e), exc_info=True)
            raise
    
    def _identify_ec_site_from_url(self, url):
        """URLからECサイトコードを特定"""
        try:
            if 'amazon.co.jp' in url:
                return 'amazon'
            elif 'rakuten.co.jp' in url:
                return 'rakuten'
            elif 'yahoo' in url and 'shopping' in url:
                return 'yahoo'
            else:
                logger.warning('未対応のECサイトURLです: %s', url)
                raise ValueError("対応していないECサイトのURLです")
        except Exception as e:
            logger.error('ECサイト識別中にエラーが発生しました - URL: %s, エラー: %s', url, str(e))
            raise
    
    def _get_ec_site_name(self, code):
        """ECサイトコードから表示名を取得"""
        site_names = {
            'amazon': 'Amazon',
            'rakuten': '楽天市場',
            'yahoo': 'Yahoo!ショッピング'
        }
        name = site_names.get(code, code.capitalize())
        logger.debug('ECサイト名を取得しました - コード: %s, 名称: %s', code, name)
        return name
    
    def _fetch_product_info(self, url, ec_site_code):
        """ECサイトに応じたコネクターで商品情報を取得"""
        logger.debug('商品情報の取得を開始します - ECサイト: %s, URL: %s', ec_site_code, url)
        try:
            connector = self._get_connector(ec_site_code)
            product_info = connector.fetch_product_info(url)
            logger.debug('商品情報の取得が完了しました: %s', product_info.get('name'))
            return product_info
        except Exception as e:
            logger.error('商品情報の取得中にエラーが発生しました - ECサイト: %s, URL: %s, エラー: %s', 
                        ec_site_code, url, str(e), exc_info=True)
            raise
    
    def _get_connector(self, ec_site_code):
        """コネクターを取得"""
        connectors = {
            'amazon': self.amazon_connector,
            'rakuten': self.rakuten_connector,
            'yahoo': self.yahoo_connector,
        }
        connector = connectors.get(ec_site_code)
        if not connector:
            logger.error('未対応のコネクターが要求されました: %s', ec_site_code)
            raise ValueError(f"{ec_site_code}のコネクターはサポートされていません")
        logger.debug('コネクターを取得しました - ECサイト: %s, コネクター: %s', 
                    ec_site_code, connector.__class__.__name__)
        return connector
