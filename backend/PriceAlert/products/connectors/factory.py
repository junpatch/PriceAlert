import logging
from django.conf import settings
from typing import Dict, List, Optional, Union, Any, Tuple, Type, Set
from collections import Counter
from ..models import ECSite
from .base import ECConnector, ProductData

logger = logging.getLogger('products')

class ECConnectorFactory:
    """ECサイトコネクタのファクトリークラス"""

    def __init__(self) -> None:
        """
        コネクター初期化
        各コネクタはここでインポートして遅延初期化
        """
        self._connectors: Dict[str, ECConnector] = {}
        self._connector_classes: Dict[str, Type[ECConnector]] = {}
        self._site_urls_patterns = {
            'amazon': ['amazon.co.jp'],
            'rakuten': ['rakuten.co.jp'],
            'yahoo': ['shopping.yahoo.co.jp', 'store.shopping.yahoo.co.jp'],
        }
        
    def _get_connector(self, ec_site_code: str) -> ECConnector:
        """ECサイトコードに対応するコネクターを取得（遅延初期化）"""
        if ec_site_code not in self._connectors:
            # 必要なタイミングで遅延ロード
            if ec_site_code == 'amazon':
                from .amazon import AmazonConnector
                self._connectors[ec_site_code] = AmazonConnector()
            elif ec_site_code == 'rakuten':
                from .rakuten import RakutenConnector
                self._connectors[ec_site_code] = RakutenConnector()
            elif ec_site_code == 'yahoo':
                from .yahoo import YahooConnector
                self._connectors[ec_site_code] = YahooConnector()
            else:
                logger.error('未対応のコネクターが要求されました: %s', ec_site_code)
                raise ValueError(f"{ec_site_code}のコネクターはサポートされていません")
                
        logger.debug('コネクターを取得しました - ECサイト: %s, コネクター: %s', 
                    ec_site_code, self._connectors[ec_site_code].__class__.__name__)
        return self._connectors[ec_site_code]

    def search_by_url(self, url: str, ec_site_code: Optional[str] = None) -> Set[str]:
        """URLから商品を検索"""
        logger.debug('URL検索を開始します - URL: %s', url)
        
        try:
            # ECサイトコードが指定されていない場合はURLから判定
            if not ec_site_code:
                ec_site_code = self._identify_ec_site_from_url(url)
                
            # ECサイト登録確認
            self._create_ECSite(ec_site_code)
            
            # コネクター取得
            connector = self._get_connector(ec_site_code)
            
            # 検索実行
            jan_codes = connector.search_by_url(url)
            if not jan_codes or len(jan_codes) == 0:
                raise ValueError(f"URL検索でJANコードが見つかりませんでした")
            
            return jan_codes
            
        except Exception as e:
            logger.error('URL検索中にエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            raise
    
    def search_by_jan_code(self, jan_code: str) -> List[Dict[str, Any]]:
        """JANコードから商品を検索"""
        logger.debug('JANコード検索を開始します - JANコード: %s', jan_code)
        
        try:
            all_product_infos: List[Dict[str, Any]] = []
            
            # 各ECサイトで検索
            for ec_site_code in self._site_urls_patterns.keys():
                    
                try:
                    # ECサイト登録確認
                    self._create_ECSite(ec_site_code)
                    
                    # コネクター取得
                    connector = self._get_connector(ec_site_code)
                    
                    # 検索実行
                    product_data_list = connector.search_by_jan_code(jan_code)
                    
                    # 結果がある場合のみマージ (dictに変換)
                    if product_data_list:
                        product_infos = [data.to_dict() for data in product_data_list]
                        all_product_infos.extend(product_infos)
                        
                except Exception as e:
                    # 個別のコネクターエラーは全体の検索を中断しない
                    logger.warning(
                        'ECサイト個別の検索でエラーが発生しました - JANコード: %s, ECサイト: %s, エラー: %s', 
                        jan_code, ec_site_code, str(e))
            site_counts = Counter(dict['ec_site'] for dict in all_product_infos if dict.get('ec_site') in {'amazon', 'rakuten', 'yahoo'})
            logger.info(    
                f"JANコード検索が完了しました - JANコード: {jan_code}, - 結果件数: "
                f"Amazon {site_counts.get('amazon', 0)}件 "
                f"楽天 {site_counts.get('rakuten', 0)}件 "
                f"Yahoo {site_counts.get('yahoo', 0)}件"
            )
            return all_product_infos
            
        except Exception as e:
            logger.error('JANコード検索中にエラーが発生しました - JANコード: %s, エラー: %s', 
                        jan_code, str(e), exc_info=True)
            raise

    def _identify_ec_site_from_url(self, url: str) -> str:
        """URLからECサイトを特定する"""
        for site_code, patterns in self._site_urls_patterns.items():
            for pattern in patterns:
                if pattern in url:
                    logger.debug('ECサイトを識別しました: %s', site_code)
                    return site_code
        
        logger.error('未対応のECサイトURLです: %s', url)
        raise ValueError("対応していないECサイトのURLです")

    def _get_ec_site_name(self, code: str) -> str:
        """ECサイトコードから表示名を取得"""
        site_names = {
            'amazon': 'Amazon',
            'rakuten': '楽天市場',
            'yahoo': 'Yahoo!ショッピング'
        }
        return site_names.get(code, code.capitalize())

    def _create_ECSite(self, ec_site_code: str) -> Tuple[ECSite, bool]:
        """ECサイト情報をDBに登録（なければ作成）"""
        # ECサイトをDBから取得（なければ作成）
        ec_site, created = ECSite.objects.get_or_create(
            code=ec_site_code,
            defaults={
                'name': self._get_ec_site_name(ec_site_code)
            }
        )
        if created:
            logger.info('新規ECサイトを作成しました: %s', ec_site.name)
        return ec_site, created
