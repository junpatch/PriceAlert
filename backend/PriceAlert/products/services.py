import logging
from django.utils import timezone
from django.db import transaction
from .models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from .connectors.factory import ECConnectorFactory

logger = logging.getLogger('products')

class ProductService:
    """商品関連のビジネスロジック"""
    
    def __init__(self):
        self.factory = ECConnectorFactory()
    
    def register_product_from_url(self, user_id, url=None, jan_code=None, price_threshold=None):
        """URLから商品を登録する"""
        logger.info('商品登録を開始します - URL: %s..., JANコード: %s, ユーザーID: %s', url[:30] if url else None, jan_code, user_id)
        
        try:          
            # コネクターを使用して商品情報を取得
            product_infos = self.factory.fetch_product_info(url, jan_code)
            logger.debug('商品情報を取得しました: %s', [product_info.get('name') for product_info in product_infos])
            
            # トランザクション開始（すべての処理を一括で行う）
            with transaction.atomic():
                for product_info in product_infos:
                    # JANコードとモデル番号がない場合は新規商品を作成（暫定対応）
                    # TODO: JANコードとモデル番号がない場合の対応
                    jan_code = product_info.get('jan_code')
                    model_number = product_info.get('model_number')
                    if not jan_code and not model_number:
                        product = Product.objects.create(
                            jan_code=jan_code,
                            model_number=model_number,
                            name=product_info.get('name'),
                            description=product_info.get('description'),
                            image_url=product_info.get('image_url'),
                            manufacturer=product_info.get('manufacturer')
                        )
                        created = True
                    else:
                        # 商品をDBに保存（既存の場合は取得）
                        product, created = Product.objects.update_or_create(
                            jan_code=jan_code,
                            model_number=model_number,
                            defaults={
                                'name': product_info.get('name'),
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
                        ec_site=ECSite.objects.get(code=product_info.get('ec_site')),
                        ec_product_id=product_info.get('ec_product_id'),
                        defaults={
                            'product_url': product_info.get('product_url'),
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
                
                logger.info('商品登録が完了しました - URL: %s, JANコード: %s', url[:30] if url else None, jan_code)
                return {
                    'user_product': user_product,
                    'product': product,
                    'product_on_ec_site': product_on_ec_site
                }
            
        except Exception as e:
            logger.error('商品登録中にエラーが発生しました - URL: %s, JANコード: %s, エラー: %s', url, jan_code, str(e), exc_info=True)
            raise