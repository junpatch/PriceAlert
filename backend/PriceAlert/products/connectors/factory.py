from .amazon import AmazonConnector
from .rakuten import RakutenConnector
from .yahoo import YahooConnector
import logging
from django.conf import settings
from ..models import ECSite
from typing import Dict, List, Optional, Union, Any, Tuple
from .base import ECConnector

logger = logging.getLogger('products')

class ECConnectorFactory:
    def __init__(self) -> None:
        self.connectors: Dict[str, ECConnector] = {
            'amazon': AmazonConnector(),
            'rakuten': RakutenConnector(),
            'yahoo': YahooConnector(),
        }

    def search_by_url(self, url: str, ec_site_code: Optional[str] = None) -> List[Dict[str, Any]]:
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
            product_infos = connector.search_by_url(url)

            if not product_infos:
                raise ValueError(f"検索結果が見つかりませんでした")
            
            logger.info('URL検索が完了しました - URL: %s..., 結果件数: %d', 
                        url[:30], len(product_infos))
            return product_infos
            
        except Exception as e:
            logger.error('URL検索中にエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            raise
    
    def search_by_jan_code(self, jan_code: str, exclude_ec_sites: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """JANコードから商品を検索"""
        logger.debug('JANコード検索を開始します - JANコード: %s', jan_code)
        # exclude_ec_sites = exclude_ec_sites or []
        
        try:
            all_product_infos: List[Dict[str, Any]] = []
            
            # 各ECサイトで検索
            for ec_site_code, connector in self.connectors.items():
                # if ec_site_code in exclude_ec_sites:
                #     logger.debug('ECサイトは検索対象から除外されています - ECサイト: %s', ec_site_code)
                #     continue
                    
                try:
                    # ECサイト登録確認
                    self._create_ECSite(ec_site_code)
                    
                    # 検索実行
                    product_infos = connector.search_by_jan_code(jan_code)
                    
                    # 結果がある場合のみマージ
                    if product_infos:
                        all_product_infos.extend(product_infos)
                        
                except Exception as e:
                    # 個別のコネクターエラーは全体の検索を中断しない
                    logger.warning(
                        'ECサイト個別の検索でエラーが発生しました - JANコード: %s, ECサイト: %s, エラー: %s', 
                        jan_code, ec_site_code, str(e))
            
            logger.info('JANコード検索が完了しました - JANコード: %s, 結果件数: %d', 
                        jan_code, len(all_product_infos))
            return all_product_infos
            
        except Exception as e:
            logger.error('JANコード検索中にエラーが発生しました - JANコード: %s, エラー: %s', 
                        jan_code, str(e), exc_info=True)
            raise

    def _identify_ec_site_from_url(self, url: str) -> str:
        """URLからECサイトを特定する"""
        keywords = [
            "amazon",
            "rakuten",
            "yahoo",
        ]
        for keyword in keywords:
            if keyword in url:
                logger.debug('ECサイトを識別しました: %s', keyword)
                return keyword
        
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

    def _get_connector(self, ec_site_code: str) -> ECConnector:
        """ECサイトコードに対応するコネクターを取得"""
        connector = self.connectors.get(ec_site_code)
        if not connector:
            logger.error('未対応のコネクターが要求されました: %s', ec_site_code)
            raise ValueError(f"{ec_site_code}のコネクターはサポートされていません")
        logger.debug('コネクターを取得しました - ECサイト: %s, コネクター: %s', 
                    ec_site_code, connector.__class__.__name__)
        return connector

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
