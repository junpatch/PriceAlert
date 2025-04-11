from abc import ABC, abstractmethod
import re

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

    def _find_jan_codes(self,data):
        """JANコードを抽出する"""
        jan_codes = []

        if isinstance(data, dict):
            for value in data.values():
                jan_codes.extend(self._find_jan_codes(value))

        elif isinstance(data, list):
            for item in data:
                jan_codes.extend(self._find_jan_codes(item))

        elif isinstance(data, str):
            jan_codes.extend(re.findall(r'\b\d{13}\b', data))

        return jan_codes