import logging
import time
from collections import defaultdict

from typing import Dict, List, Optional, Set, Any, Tuple
from django.utils import timezone
from django.db import transaction, connection

from ..models import Product, ECSite, ProductOnECSite, PriceHistory, UserProduct
from ..connectors.factory import ECConnectorFactory
from .save_to_db_service import SaveToDBService as sds

logger = logging.getLogger(__name__)

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
        
        # クエリカウンタをリセット
        reset_queries_stats()
        
        try:
            # 処理結果格納用
            all_product_infos: List[Dict[str, Any]] = []
            jan_codes: Set[str] = set()

            # URLが指定されている場合はURLから検索
            if url:
                # URLからの検索実行
                jan_codes = self.factory.search_by_url(url)
                if not jan_codes:
                    logger.warning('URLからの検索でJANコードが見つかりませんでした - URL: %s', url)
                    return []
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
            
            # クエリをカウント
            checkpoint_queries_stats("検索前")
            
            # キャッシュを用意（コード→オブジェクト）
            ec_site_cache = {}
            product_cache = {}

            # クエリをカウント
            checkpoint_queries_stats("ec_site取得前")
            
            # 検索結果をDBに保存
            stats = {
                'new_products': 0,
                'new_ec_sites': 0,
                'new_price_histories': 0
            }
            saved_products: List[Product] = []
            with transaction.atomic():
                for product_info in all_product_infos:
                    if product_info['jan_code'] not in product_cache:
                        saved_product, created = sds.save_product(product_info)
                        stats['new_products'] += 1 if created else 0
                        saved_products.append(saved_product)
                        product_cache[product_info['jan_code']] = saved_product

                        saved_user_product, created = sds.save_user_product(saved_product, user_id, price_threshold)

                    # EC Siteキャッシュを渡す
                    saved_product_on_ec_site, created, is_price_changed = sds.save_product_on_ec_site_and_price_history(
                        saved_product, product_info, ec_site_cache
                    )
                    stats['new_ec_sites'] += 1 if created else 0
                    stats['new_price_histories'] += 1 if is_price_changed else 0


            
            # クエリをカウント
            checkpoint_queries_stats("DB保存後")
            
            # 集計結果をログ出力
            logger.info(
                f'商品情報の保存が完了しました - 新規商品: {stats["new_products"]}件, '
                f'新規ECサイト: {stats["new_ec_sites"]}件, '
                f'価格更新: {stats["new_price_histories"]}件',
            )
            
            # 最終的なクエリ統計の出力
            dump_queries_stats()
            
            return saved_products
            
        except Exception as e:
            logger.error('商品検索中にエラーが発生しました - URL: %s, JANコード: %s, エラー: %s', 
                        url, jan_code, str(e), exc_info=True)
            raise

# SQLクエリをモニタリングするための変数とメソッド
query_stats = defaultdict(int)
queries_log = []
query_timestamps = {}

def reset_queries_stats():
    """クエリ統計をリセット"""
    global query_stats, queries_log, query_timestamps
    query_stats.clear()
    queries_log.clear()
    query_timestamps.clear()
    
def checkpoint_queries_stats(checkpoint_name):
    """現在のSQLクエリの状態をログに記録"""
    current_count = len(connection.queries)
    logger.info(f"[SQL統計] {checkpoint_name}: 現在のSQLクエリ数は {current_count}個です")
    
    # 新しいクエリを記録
    for idx, query_info in enumerate(connection.queries):
        if idx >= len(queries_log):
            query = query_info['sql']
            query_stats[query] += 1
            queries_log.append(query)
            query_timestamps[query] = query_info['time']

def dump_queries_stats():
    """重複クエリを含む詳細なSQLクエリ統計をログに出力"""
    total_queries = len(queries_log)
    duplicate_count = sum(count - 1 for count in query_stats.values() if count > 1)
    duplicate_percent = (duplicate_count / total_queries * 100) if total_queries > 0 else 0
    
    logger.info(f"[SQL統計] 合計SQLクエリ数: {total_queries}, 重複クエリ数: {duplicate_count} ({duplicate_percent:.1f}%)")
    
    # 重複クエリ数が多い順にソート
    sorted_queries = sorted(query_stats.items(), key=lambda x: x[1], reverse=True)
    
    # 重複クエリのみを表示
    for query, count in sorted_queries:
        if count > 1:
            time_spent = query_timestamps.get(query, 'unknown')
            logger.info(f"[重複SQL] {count}回実行されたクエリ (実行時間: {time_spent}): {query[:150]}...")

def print_queries():
    for query in connection.queries:
        print(query['sql'])