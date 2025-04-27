import logging

from typing import List, Optional, Dict, Any
from django.db import transaction
from ..connectors.factory import ECConnectorFactory
from ..models import ProductOnECSite, Product
from .save_to_db_service import SaveToDBService as sds

logger = logging.getLogger(__name__)

class PriceService:
    """価格関連のビジネスロジック"""
    
    def __init__(self):
        self.factory = ECConnectorFactory()

    def fetch_price(self) -> Dict[str, int]:
        """URLから商品を検索"""
        logger.info('価格取得を開始します')
        
        # すべての商品を取得
        products = Product.objects.all()

        # JANコードごとにループ
        stats_all = {
            'new_ec_sites': 0,
            'new_price_histories': 0
        }
        for product in products:

            jan_code = product.jan_code
            if jan_code is None:
                logger.warning(f'JANコードがありません - {product}')
                continue

            # 各ECサイトで価格を取得
            try:
                found_products = self.factory.search_by_jan_code(jan_code)
                if not found_products:
                    # TODO: 商品が見つからないときはsearch_by_jan_code内で処理をするべきか
                    logger.warning(f'JANコードから商品が見つかりません - JANコード: {jan_code}')
                    continue
            except Exception as e:
                logger.error('価格取得に失敗しました - JANコード: %s, エラー: %s', 
                             jan_code, str(e))
                continue
            
            products_with_info = [(product, found_product) for found_product in found_products]
            ec_site_cache = {}
            with transaction.atomic():
                results = sds.save_product_on_ec_site_and_price_history_batch(products_with_info, ec_site_cache)
            

            # 統計情報の更新
            stats = {
                'new_ec_sites': 0,
                'new_price_histories': 0
            }
            for _, created, is_price_changed in results:
                stats['new_ec_sites'] += 1 if created else 0
                stats['new_price_histories'] += 1 if is_price_changed else 0

            logger.info(
                f'DBへの保存が完了しました - JANコード: {jan_code} - 新規ECサイト: {stats["new_ec_sites"]}件, '
                f'価格更新: {stats["new_price_histories"]}件',
            )

            stats_all['new_ec_sites'] += stats['new_ec_sites']
            stats_all['new_price_histories'] += stats['new_price_histories']

        return stats_all


    def is_minimum_price_changed(self, product: Product, new_or_price_changed_products: List[Dict[str, Any]]) -> bool:
        return True

    def notify_users(self, products: List[ProductOnECSite]):
        pass

