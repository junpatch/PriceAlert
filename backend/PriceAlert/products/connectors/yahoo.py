from .base import ECConnector
import logging

logger = logging.getLogger('products')

class YahooConnector(ECConnector):

    def __init__(self):
        self.yahoo_api = None
        self.ec_site = "yahoo"

    def fetch_product_info(self, url=None, jan_code=None):
        """商品URLから情報を取得する"""
        logger.info("---Yahooで検索開始---")
        return None
    
    def fetch_price(self, url):
        """商品URLから価格情報のみ取得する"""
        pass