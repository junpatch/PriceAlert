from .amazon import AmazonConnector
from .rakuten import RakutenConnector
from .yahoo import YahooConnector
import logging
from django.conf import settings
from ..models import ECSite

logger = logging.getLogger('products')

class ECConnectorFactory:
    def __init__(self):
        self.connectors = {
            'amazon': AmazonConnector(),
            'rakuten': RakutenConnector(),
            'yahoo': YahooConnector(),
        }

    def fetch_product_info(self, url=None, jan_code=None):
        """ECサイトに応じたコネクターで商品情報を取得"""
        logger.debug('商品情報の取得を開始します - URL: %s, JANコード: %s', url, jan_code)
        try:
            # JANコードがない場合はURLからJANコードを取得
            if not jan_code:
                # ECサイトを特定
                ec_site_code = self._identify_ec_site_from_url(url)

                self._create_ECSite(ec_site_code)
            
                connector = self._get_connector(ec_site_code)
                
            # JANコードを使って横断的に商品情報を取得
            product_infos = []
            for connector in self.connectors.values():
                self._create_ECSite(connector.ec_site)
                new_product_info = connector.fetch_product_info(url=None, jan_code=jan_code)
                
                product_infos.extend(new_product_info) if new_product_info else None

            logger.debug('%s件の商品情報の取得が完了しました', len(product_infos))

            return product_infos
        
        except Exception as e:
            logger.error('商品情報の取得中にエラーが発生しました - ECサイト: %s, URL: %s, JANコード: %s, エラー: %s', 
                        ec_site_code, url, jan_code, str(e), exc_info=True)
            raise

    def _identify_ec_site_from_url(self, url):
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
        
        if not keyword:
            logger.error('未対応のECサイトURLです: %s', url)
            raise ValueError("対応していないECサイトのURLです")

    def _get_ec_site_name(self, code):
        """ECサイトコードから表示名を取得"""
        site_names = {
            'amazon': 'Amazon',
            'rakuten': '楽天市場',
            'yahoo': 'Yahoo!ショッピング'
        }
        return site_names.get(code, code.capitalize())

    def _get_connector(self, ec_site_code):
        connector = self.connectors.get(ec_site_code, None)
        if not connector:
            logger.error('未対応のコネクターが要求されました: %s', ec_site_code)
            raise ValueError(f"{ec_site_code}のコネクターはサポートされていません")
        logger.debug('コネクターを取得しました - ECサイト: %s, コネクター: %s', 
        ec_site_code, connector.__class__.__name__)
        return connector

    def _create_ECSite(self, ec_site_code):
        # ECサイトをDBから取得（なければ作成）
        ec_site, created = ECSite.objects.get_or_create(
            code=ec_site_code,
            defaults={
                'name': self._get_ec_site_name(ec_site_code)
            }
        )
        if created:
            logger.info('新規ECサイトを作成しました: %s', ec_site.name)
