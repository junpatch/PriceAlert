from abc import ABC, abstractmethod


class ECConnector(ABC):
    """ECサイト接続の基底クラス"""
    @abstractmethod
    def fetch_product_info(self,url):
        """商品URLから情報を取得する"""
        pass

    @abstractmethod
    def fetch_price(self, url):
        """商品URLから価格情報のみ取得する"""
        pass

