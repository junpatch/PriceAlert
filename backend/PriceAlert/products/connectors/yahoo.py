from .base import ECConnector
import logging
import re
import requests
from typing import List, Dict, Any, Optional, cast, Tuple
from django.conf import settings
logger = logging.getLogger('products')

class YahooConnector(ECConnector):

    def __init__(self):
        self.ec_site = "yahoo"
        self.api_key = settings.YAHOO_CLIENT_ID
        self.affiliate_id = settings.YAHOO_AFFILIATE_ID
        self.user_rank = "guest"
        self.request_url = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
    
    def search_by_url(self, url: str) -> List[Dict[str, Any]]:
        """URLから商品を検索する"""
        logger.debug('Yahoo: URL検索を開始 - URL: %s', url)
        
        
        try:
            # URLから商品コードと店舗コードを抽出
            shop_code, item_code = self._extract_item_code_and_shop_code(url)
            if not shop_code or not item_code:
                logger.warning('Yahoo: URLから商品コードが見つかりませんでした - URL: %s', url)
                return []

            # JANコードで検索
            response = self._search_item(query=f"{item_code} {shop_code}")
            
            # 検索結果から商品情報を取得
            if not response or response.get("totalResultsReturned") == 0:
                logger.warning('Yahoo: URLから商品が見つかりませんでした - URL: %s', url)
                return []

            # 検索結果を整形
            result: List[Dict[str, Any]] = []
            for item in response["hits"]:
                product_info = self._format_product_info(item)
                result.append(product_info)

            return result
            
        except Exception as e:
            logger.error('Yahoo: URL検索中に予期せぬエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            return []
    
    def search_by_jan_code(self, jan_code: str) -> List[Dict[str, Any]]:
        """JANコードから商品を検索する"""
        logger.debug('Yahoo: JANコード検索を開始 - JANコード: %s', jan_code)
        
        try:
            # JANコードで検索
            response = self._search_item(jan_code=jan_code)
            
            # 検索結果から商品情報を取得
            if not response or response.get("totalResultsReturned") == 0:
                logger.warning('Yahoo: JANコードに一致する商品が見つかりませんでした - JANコード: %s', jan_code)
                return []
            
            result: List[Dict[str, Any]] = []
            for item in response["hits"]:
                product_info = self._format_product_info(item, jan_code)
                result.append(product_info)
            
            return result
            
        except Exception as e:
            logger.error('Yahoo: JANコード検索中に予期せぬエラーが発生しました - JANコード: %s, エラー: %s', 
                        jan_code, str(e), exc_info=True)
            return []
    
    def fetch_price(self, url: str) -> Dict[str, Any]:
        """商品URLから価格情報のみ取得する"""
        # 未実装
        return {}
    
    def extract_product_id(self, url: str) -> Optional[str]:
        """商品URLから商品IDを抽出する"""
        # 例: https://store.shopping.yahoo.co.jp/shop/product_id.html
        product_id_match = re.search(r'yahoo\.co\.jp/(?:[^/]+/)?([^/]+?)(?:\.html|$)', url)
        if product_id_match:
            return product_id_match.group(1)
        return None
    
    def _search_item(self, **kwargs: Any) -> Dict[str, Any]:
        """YahooAPIで商品検索を実行"""
        params: Dict[str, Any] = {
            "appid": self.api_key,
            # "affiliateId": self.affiliate_id,
            "user_rank": self.user_rank,
        }
        params.update(kwargs)
        
        response = requests.get(self.request_url, params=params)

        if response.status_code != 200:
            logger.error('YahooAPI呼び出しエラー - ステータスコード: %d, レスポンス: %s', 
                        response.status_code, response.text)
            return {}
        
        return cast(Dict[str, Any], response.json())
    
    def _extract_item_code_and_shop_code(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """商品URLから商品コードと店舗コードを抽出する"""
        item_code_match = re.search(r"yahoo.co.jp/([^/]+)\/([^/]+).html", url)
        if item_code_match:
            shop_code = item_code_match.group(1)
            item_code = item_code_match.group(2)
            return shop_code, item_code
        return None, None
    
    def _format_product_info(self, item: Dict[str, Any], jan_code: Optional[List[str] | str] = None) -> Dict[str, Any]:
        """商品情報を整形する共通メソッド"""

        # JANコードがない場合は商品情報から探す
        if not jan_code:
            jan_code = self._get_nested_attr_or_key(item, 'janCode', "")
        if not isinstance(jan_code, list):
            jan_code = [jan_code]

        result = {
            'name': self._get_nested_attr_or_key(item, 'name', ""),
            'description': self._get_nested_attr_or_key(item, 'description', ""),
            'image_url': self._get_nested_attr_or_key(item, 'image.medium', ""),
            'manufacturer': self._get_nested_attr_or_key(item, 'brand.name', ""),
            'model_number': "",
            'jan_code': jan_code,
            'price': int(self._get_nested_attr_or_key(item, 'price', 0)),
            'points': int(self._get_nested_attr_or_key(item, 'point.amount', 0)),
            'effective_price': int(self._get_nested_attr_or_key(item, 'price', 0)),
            'shipping_fee': 0,
            # 'shipping_fee': self._get_nested_attr_or_key(item, 'shipping.name', 0),
            'condition': self._get_nested_attr_or_key(item, 'condition', "").lower(),
            'seller_name': self._get_nested_attr_or_key(item, 'seller.name', ""),
            'ec_product_id': self._get_nested_attr_or_key(item, 'code', ""),
            'product_url': self._get_nested_attr_or_key(item, 'url', ""),
            # 'affiliate_url': self._get_nested_attr(item, 'affiliateUrl', ""),
            'affiliate_url': "",
            'ec_site': 'yahoo'
        }
 
        return result