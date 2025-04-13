from .base import ECConnector
from django.conf import settings
import requests
import re
import logging
from typing import List, Dict, Any, Optional, Union, Tuple, cast

logger = logging.getLogger(__name__)

class RakutenConnector(ECConnector):

    def __init__(self):
        self.ec_site = "rakuten"
        self.api_key = settings.RAKUTEN_API_KEY
        self.api_secret = settings.RAKUTEN_API_SECRET
        self.affiliate_id = settings.RAKUTEN_AFFILIATE_ID

        self.request_url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    def search_by_url(self, url: str) -> List[Dict[str, Any]]:
        """URLから商品を検索する"""
        logger.debug('楽天: URL検索を開始 - URL: %s', url)
        
        try:
            # URLから商品コードと店舗コードを抽出
            shop_code, item_code = self.extract_item_code_and_shop_code(url)
            if not shop_code or not item_code:
                logger.warning('楽天: URLから商品コードが見つかりませんでした - URL: %s', url)
                return []

            # 商品コードと店舗コードで検索
            response = self._search_item(keyword=f"{item_code} {shop_code}")
            
            # 検索結果を整形
            result: List[Dict[str, Any]] = []
            for item_info in response["Items"]:
                product_info = self._format_product_info(item_info["Item"])
                result.append(product_info)
            
            return result
            
        except Exception as e:
            logger.error('楽天: URL検索中に予期せぬエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            return []
    
    def search_by_jan_code(self, jan_code: str) -> List[Dict[str, Any]]:
        """JANコードから商品を検索する"""
        logger.debug('楽天: JANコード検索を開始 - JANコード: %s', jan_code)
        
        try:
            # JANコードで検索
            response = self._search_item(keyword=jan_code)
            
            # 検索結果から商品情報を取得
            if not response or response.get("count") == 0:
                logger.warning('楽天: JANコードに一致する商品が見つかりませんでした - JANコード: %s', jan_code)
                return []
            
            result: List[Dict[str, Any]] = []
            for item_info in response["Items"]:
                product_info = self._format_product_info(item_info["Item"], jan_code)
                result.append(product_info)
            
            return result
            
        except Exception as e:
            logger.error('楽天: JANコード検索中に予期せぬエラーが発生しました - JANコード: %s, エラー: %s', 
                        jan_code, str(e), exc_info=True)
            return []
    
    def _search_item(self, **kwargs: Any) -> Dict[str, Any]:
        """楽天APIで商品検索を実行"""
        params: Dict[str, Any] = {
            "applicationId": self.api_key,
            # "affiliateId": self.affiliate_id,
            "format": "json",
            "format_version": "2",
        }
        params.update(kwargs)
        
        response = requests.get(self.request_url, params=params)
        if response.status_code != 200:
            logger.error('楽天API呼び出しエラー - ステータスコード: %d, レスポンス: %s', 
                        response.status_code, response.text)
            return {}
        
        return cast(Dict[str, Any], response.json())
    
    def fetch_price(self, url: str) -> Dict[str, Any]:
        """商品URLから価格情報のみ取得する"""
        # 現状は未実装
        return {}

    def extract_item_code_and_shop_code(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """商品URLから商品コードと店舗コードを抽出する"""
        item_code_match = re.search(r"rakuten.co.jp/([^/]+)\/([^/?]+)", url)
        if item_code_match:
            shop_code = item_code_match.group(1)
            item_code = item_code_match.group(2)
            return shop_code, item_code
        return None, None
    
    def _format_product_info(self, item_info: Dict[str, Any], jan_code: Optional[List[str] | str] = None) -> Dict[str, Any]:
        """商品情報を整形する共通メソッド"""

        # JANコードがない場合は商品情報から探す
        if not jan_code:
            jan_code = self._find_jan_codes(item_info)
        if not isinstance(jan_code, list):
            jan_code = [jan_code]

        result = {
            'name': self._get_nested_attr_or_key(item_info, 'itemName', ""),
            'description': self._get_nested_attr_or_key(item_info, 'itemCaption', ""),
            'image_url': self._get_nested_attr_or_key(item_info, 'mediumImageUrls[0].imageUrl', ""),
            'manufacturer': self._get_nested_attr_or_key(item_info, 'shopName', ""),
            'model_number': "",
            'jan_code': jan_code,
            'price': int(self._get_nested_attr_or_key(item_info, 'itemPrice', 0)),
            'points': int(self._get_nested_attr_or_key(item_info, 'itemPoints', 0)),
            'effective_price': int(self._get_nested_attr_or_key(item_info, 'itemPrice', 0)),
            'shipping_fee': 0,
            'condition': self._get_nested_attr_or_key(item_info, 'itemCondition.value', "").lower(),
            'seller_name': self._get_nested_attr_or_key(item_info, 'shopName', ""),
            'ec_product_id': self._get_nested_attr_or_key(item_info, 'itemCode', ""),
            'product_url': self._get_nested_attr_or_key(item_info, 'itemUrl', ""),
            # 'affiliate_url': self._get_nested_attr(item_info, 'affiliateUrl', ""),
            'affiliate_url': "",
            'ec_site': 'rakuten'
        }
 
        return result