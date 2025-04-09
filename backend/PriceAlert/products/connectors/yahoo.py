from .base import ECConnector

class YahooConnector(ECConnector):

    def __init__(self):
        self.yahoo_api = None

    def fetch_product_info(self, url):
        """商品URLから情報を取得する"""
        pass
    
    def fetch_price(self, url):
        """商品URLから価格情報のみ取得する"""
        pass