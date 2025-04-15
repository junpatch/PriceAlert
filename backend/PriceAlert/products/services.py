import logging
from typing import Dict, List, Optional, Set, Any, Tuple
from django.utils import timezone
from django.db import transaction
from .models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from .connectors.factory import ECConnectorFactory

logger = logging.getLogger('products')

class ProductService:
    """商品関連のビジネスロジック"""
    
    def __init__(self):
        self.factory = ECConnectorFactory()

    def search_products(self, user_id: int, url: Optional[str] = None, 
                       jan_code: Optional[str] = None, 
                       price_threshold: Optional[int] = None) -> List[Product]:
        """URLまたはJANコードから商品を検索"""
        logger.info('商品検索を開始します - URL: %s..., JANコード: %s', 
                   url[:30] if url else None, jan_code)
        
        try:
            # 処理結果格納用
            all_product_infos: List[Dict[str, Any]] = []
            jan_codes: Set[str] = set()

            # URLが指定されている場合はURLから検索
            if url:
                # URLからの検索実行
                jan_codes = self.factory.search_by_url(url)
            elif jan_code:
                jan_codes = {jan_code}
            else:
                raise ValueError('URLかJANコードが指定されていません')

            # JANコードでの検索実行
            if jan_codes:
                logger.info(f'JANコードでの検索を開始します: {jan_codes}')
                for search_jan in jan_codes:
                    # 全ECサイトに対してJANコード検索
                    jan_product_infos = self.factory.search_by_jan_code(search_jan)
                    
                    # JANコードでの検索結果をマージ（重複を排除）
                    all_product_infos += [item for item in jan_product_infos if item not in all_product_infos]
            
            # 検索結果がない場合
            if not all_product_infos:
                logger.warning('検索結果が見つかりませんでした - URL: %s, JANコード: %s', 
                             url, jan_code)
                return []
            
            # 検索結果をDBに保存
            return self._save_search_results(all_product_infos, user_id, price_threshold)
            
        except Exception as e:
            logger.error('商品検索中にエラーが発生しました - URL: %s, JANコード: %s, エラー: %s', 
                        url, jan_code, str(e), exc_info=True)
            raise
    
    def _save_search_results(self, product_infos: List[Dict[str, Any]], 
                            user_id: int, 
                            price_threshold: Optional[int]) -> List[Product]:
        """検索結果をDBに保存して、製品オブジェクトのリストを返す"""
        products: List[Product] = []
        stats = {
            'new_products': 0,
            'existing_products': 0,
            'new_ec_sites': 0,
            'updated_ec_sites': 0,
            'new_price_histories': 0
        }
        
        with transaction.atomic():
            for product_info in product_infos:
                # 商品の保存
                jan_code = product_info.get('jan_code') # jan_code: str | None
                model_number = product_info.get('model_number')
                
                # ProductオブジェクトのID確認（既存の場合はupdate_or_create不要のため）
                existing_product: Optional[Product] = None
                
                # JANコードで既存商品を探す
                if jan_code:
                    existing_product = Product.objects.filter(jan_code=jan_code).first()
                
                # 既存商品がある場合は更新、なければ新規作成
                if existing_product:
                    product = existing_product
                    stats['existing_products'] += 1
                    # 商品情報が不足している場合は更新
                    if not product.image_url and product_info.get('image_url'):
                        product.image_url = product_info.get('image_url')
                        product.save(update_fields=['image_url'])
                else:
                    # 新規商品を作成
                    product_data: Dict[str, Any] = {
                        'name': product_info.get('name'),
                        'description': product_info.get('description'),
                        'image_url': product_info.get('image_url'),
                        'manufacturer': product_info.get('manufacturer'),
                        'jan_code': jan_code,
                        'model_number': model_number,
                    }
                    
                    product = Product.objects.create(**product_data)
                    stats['new_products'] += 1
                
                # ECサイト情報の保存
                product_on_ec_site, created, is_price_changed = self._save_ec_site_info(product_info, product)
                if created:
                    stats['new_ec_sites'] += 1
                else:
                    stats['updated_ec_sites'] += 1

                # 価格履歴の保存
                if is_price_changed:
                    stats['new_price_histories'] += 1

                # 結果リストに追加（重複を排除）
                if product not in products:
                    products.append(product)
                        
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
        
        # 集計結果をログ出力
        logger.info(
            '商品情報の保存が完了しました - 新規商品: %d件, 既存商品: %d件, '
            '新規ECサイト情報: %d件, 更新ECサイト情報: %d件, 新規価格履歴: %d件',
            stats['new_products'],
            stats['existing_products'],
            stats['new_ec_sites'],
            stats['updated_ec_sites'],
            stats['new_price_histories']
        )
                
        return products
    
    def _save_ec_site_info(self, product_info: Dict[str, Any], product: Product) -> Tuple[ProductOnECSite, bool, bool]:
        """ECサイト情報を保存する共通メソッド"""

        # 価格履歴保存するかを先に判断
        try:
            product_on_ec_site = ProductOnECSite.objects.filter(
                product=product,
                ec_site=ECSite.objects.get(code=product_info.get('ec_site')),
                ec_product_id=product_info.get('ec_product_id')
            ).first()
            if  product_on_ec_site and \
                (
                    product_on_ec_site.current_price != product_info.get('price') or \
                    product_on_ec_site.effective_price != product_info.get('effective_price')
                ):
                is_price_changed = True # 価格履歴保存が必要
            else:
                is_price_changed = False

        except Exception as e:
            logger.error('前回の価格履歴との比較中にエラーが発生しました。履歴を保存して続行します - 商品: %s, エラー: %s', 
                        product.name, str(e), exc_info=True)
            is_price_changed = True

        # ECサイト上の商品情報を保存
        product_on_ec_site, created = ProductOnECSite.objects.update_or_create(
            product=product,
            ec_site=ECSite.objects.get(code=product_info.get('ec_site')),
            ec_product_id=product_info.get('ec_product_id'),
            defaults={
                'seller_name': product_info.get('seller_name'),
                'product_url': product_info.get('product_url'),
                'affiliate_url': product_info.get('affiliate_url'),
                'current_price': product_info.get('price'),
                'current_points': product_info.get('points', 0),
                'shipping_fee': product_info.get('shipping_fee', 0),
                'effective_price': product_info.get('effective_price', product_info.get('price')),
                'condition': product_info.get('condition'),
                'last_updated': timezone.now(),
                'is_active': True
            }
        )
        
        # 価格履歴を保存
        try:
            if created or is_price_changed:
                price_history = PriceHistory.objects.create(
                    product_on_ec_site=product_on_ec_site,
                    price=product_info.get('price'),
                    points=product_info.get('points', 0),
                    effective_price=product_info.get('effective_price', product_info.get('price')),
                    captured_at=timezone.now()
                )
                
        except Exception as e:
            logger.error('価格履歴の保存中にエラーが発生しました - 商品: %s..., エラー: %s', 
                        product.name[:20], str(e), exc_info=True)
        return product_on_ec_site, created, is_price_changed