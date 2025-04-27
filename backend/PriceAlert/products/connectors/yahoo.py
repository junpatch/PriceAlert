from .base import ECConnector, ProductData
import logging
import re
import requests
from typing import List, Dict, Any, Optional, cast, Tuple, Set
from django.conf import settings
logger = logging.getLogger('products')

class YahooConnector(ECConnector):
    """Yahoo!ショッピング用コネクタ"""

    def __init__(self):
        super().__init__(ec_site_code="yahoo")
        self.api_key = settings.YAHOO_CLIENT_ID
        self.affiliate_id = settings.YAHOO_AFFILIATE_ID
        self.user_rank = "guest"
        self.request_url = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
    
    def search_by_url(self, url: str) -> Set[str]:
        """URLから商品を検索する"""
        logger.debug('Yahoo: URL検索を開始 - URL: %s', url)
        
        try:
            # URLから商品コードと店舗コードを抽出
            shop_code, item_code = self._extract_item_code_and_shop_code(url)
            if not shop_code or not item_code:
                logger.warning('Yahoo: URLから商品コードが見つかりませんでした - URL: %s', url)
                return set()

            # 商品コードと店舗コードで検索
            response = self._search_item(query=f"{item_code} {shop_code}")
            
            # 検索結果から商品情報を取得
            if not response or response.get("totalResultsReturned", 0) == 0:
                # 商品コードのみで検索
                response = self._search_item(query=f"{item_code}")
                if not response or response.get("totalResultsReturned", 0) == 0:
                    # それでもない場合は商品が見つからない
                    logger.warning('Yahoo: URLから商品が見つかりませんでした - URL: %s', url)
                    return set()

            all_jan_codes: Set[str] = set()
            for item in response.get("hits", []):
                jan_codes = self._find_jan_codes(item)
                all_jan_codes.update(jan_codes)
            logger.info(f'Yahoo: {len(all_jan_codes)}件のJANコードが見つかりました: {all_jan_codes}')

            return all_jan_codes
            
        except Exception as e:
            logger.error('Yahoo: URL検索中に予期せぬエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            return set()
    
    def search_by_jan_code(self, jan_code: str) -> List[ProductData]:
        """JANコードから商品を検索する"""
        logger.debug('Yahoo: JANコード検索を開始 - JANコード: %s', jan_code)
        
        try:
            # JANコードで検索
            response = self._search_item(jan_code=jan_code)
            
            # 検索結果から商品情報を取得
            if not response or response.get("totalResultsReturned", 0) == 0:
                # アイテムが見つからない：検索を続行させるためエラーハンドリングしない
                return []
            
            result: List[ProductData] = []
            for item in response.get("hits", []):
                product_data = self._format_product_data(item, jan_code=jan_code)
                result.append(product_data)
            
            return result
            
        except Exception as e:
            logger.error('Yahoo: JANコード検索中に予期せぬエラーが発生しました - JANコード: %s, エラー: %s', 
                        jan_code, str(e), exc_info=True)
            return []
    
    def fetch_price(self, url: str) -> Optional[ProductData]:
        """商品URLから価格情報のみ取得する"""
        # 未実装のため、URLから商品検索して最初の結果を返す
        return None
    
    def _extract_product_id(self, url: str) -> Optional[str]:
        """商品URLから商品IDを抽出する"""
        # 例: https://store.shopping.yahoo.co.jp/shop/product_id.html
        shop_code, item_code = self._extract_item_code_and_shop_code(url)
        return item_code
    
    def _search_item(self, **kwargs: Any) -> Dict[str, Any]:
        """YahooAPIで商品検索を実行"""
        params: Dict[str, Any] = {
            "appid": self.api_key,
            # "affiliateId": self.affiliate_id,
            "user_rank": self.user_rank,
            "results": 10,
            "sort": "+price",
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
    
    def _format_product_data(self, item: Dict[str, Any], **kwargs) -> ProductData:
        """商品情報を整形する共通メソッド"""
        # JANコードの処理
        jan_code = kwargs.get('jan_code')
        if not jan_code: # TODO: URL検索の場合。複数のJANが見つかったらどうする？
            jan_code = self._get_nested_attr_or_key(item, 'janCode', "")
        
        # ProductDataオブジェクト作成
        return ProductData(
            name=self._get_nested_attr_or_key(item, 'name', ""),
            description=self._get_nested_attr_or_key(item, 'description', ""),
            image_url=self._get_nested_attr_or_key(item, 'image.medium', ""),
            manufacturer=self._get_nested_attr_or_key(item, 'brand.name', ""),
            model_number="",
            jan_code=jan_code,
            price=int(self._get_nested_attr_or_key(item, 'price', 0)),
            points=int(self._get_nested_attr_or_key(item, 'point.amount', 0)),
            effective_price=int(self._get_nested_attr_or_key(item, 'price', 0)),
            shipping_fee=0,
            # 'shipping_fee': self._get_nested_attr_or_key(item, 'shipping.name', 0),
            condition=self._get_nested_attr_or_key(item, 'condition', "").lower(),
            seller_name=self._get_nested_attr_or_key(item, 'seller.name', ""),
            ec_product_id=self._get_nested_attr_or_key(item, 'code', ""),
            product_url=self._get_nested_attr_or_key(item, 'url', ""),
            affiliate_url="",
            # 'affiliate_url': self._get_nested_attr(item, 'affiliateUrl', ""),
            ec_site='yahoo'
        )