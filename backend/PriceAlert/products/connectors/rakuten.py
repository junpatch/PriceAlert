from .base import ECConnector, ProductData
from django.conf import settings
import requests
import re
import logging
from typing import List, Dict, Any, Optional, Tuple, cast, Set
from rest_framework.exceptions import NotFound, APIException

logger = logging.getLogger(__name__)

class RakutenConnector(ECConnector):
    """楽天市場用コネクタ"""

    def __init__(self):
        super().__init__(ec_site_code="rakuten")
        self.api_key = settings.RAKUTEN_API_KEY
        self.api_secret = settings.RAKUTEN_API_SECRET
        self.affiliate_id = settings.RAKUTEN_AFFILIATE_ID
        self.request_url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    def search_by_url(self, url: str) -> Set[str]:
        """URLから商品を検索する"""
        logger.debug(f'楽天: URL検索を開始 - URL: {url}')
        
        try:
            # URLから商品コードと店舗コードを抽出
            shop_code, item_code = self._extract_item_code_and_shop_code(url)
            if not shop_code or not item_code:
                raise NotFound(f'楽天: URLから商品コードが抽出できませんでした - URL: {url}')

            # 商品コードと店舗コードで検索
            response = self._search_item(keyword=item_code, shopCode=shop_code)
            
            if not response or response.get("count", 0) == 0:
                # 商品が見つからない
                raise NotFound(f'楽天: URLから商品が見つかりませんでした - URL: {url}')
            
            all_jan_codes: Set[str] = set()
            for item_info in response.get("Items", []):
                jan_codes = self._find_jan_codes(item_info)
                all_jan_codes.update(jan_codes)
            logger.info(f'楽天: {len(all_jan_codes)}件のJANコードが見つかりました: {all_jan_codes}')

            return all_jan_codes
        
        except NotFound as e:
            logger.info(str(e))
            return set()
        except RakutenAPIException as e:
            logger.warning(str(e))
            return set()
        except Exception as e:
            logger.error(f'楽天: URL検索中に予期せぬエラーが発生しました - URL: {url}, エラー: {str(e)}', exc_info=True)
            return set()
    
    def search_by_jan_code(self, jan_code: str) -> List[ProductData]:
        """JANコードから商品を検索する"""
        logger.debug(f'楽天: JANコード検索を開始 - JANコード: {jan_code}')
        
        try:
            # JANコードで検索
            response = self._search_item(keyword=jan_code)
            
            # 検索結果から商品情報を取得
            if not response or response.get("count", 0) == 0:
                raise NotFound(f'楽天: JANコードから商品が見つかりませんでした - JANコード: {jan_code}')
            
            result: List[ProductData] = []
            for item_info in response.get("Items", []):
                product_data = self._format_product_data(item_info.get("Item", {}), jan_code=jan_code)
                result.append(product_data)
            
            return result
        
        except NotFound as e:
            logger.info(str(e))
            return []
        except RakutenAPIException as e:
            logger.warning(str(e))
            return []
        except Exception as e:
            logger.error(f'楽天: JANコード検索中に予期せぬエラーが発生しました - JANコード: {jan_code}, エラー: {str(e)}', exc_info=True)
            return []
    
    def _search_item(self, **kwargs: Any) -> Dict[str, Any]:
        """楽天APIで商品検索を実行"""
        params: Dict[str, Any] = {
            "applicationId": self.api_key,
            # "affiliateId": self.affiliate_id,
            "format": "json",
            "format_version": "2",
            "hits": 10,
            "sort": "+itemPrice",
        }
        params.update(kwargs)
        
        response = requests.get(self.request_url, params=params)
        if response.status_code != 200:
            raise RakutenAPIException(f'楽天APIからエラー応答を受け取りました: {response.status_code}')
        
        return cast(Dict[str, Any], response.json())
    
    def fetch_price(self, url: str) -> Optional[ProductData]:
        """商品URLから価格情報のみ取得する"""
        # 未実装
        return None

    def _extract_item_code_and_shop_code(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """商品URLから商品コードと店舗コードを抽出する"""
        item_code_match = re.search(r"rakuten.co.jp/([^/]+)\/([^/?]+)", url)
        if item_code_match:
            shop_code = item_code_match.group(1)
            item_code = item_code_match.group(2)
            return shop_code, item_code
        return None, None
    
    def _extract_product_id(self, url: str) -> Optional[str]:
        """商品URLから商品IDを抽出する"""
        shop_code, item_code = self._extract_item_code_and_shop_code(url)
        return item_code
    
    def _format_product_data(self, item_info: Dict[str, Any], **kwargs) -> ProductData:
        """商品情報を整形する共通メソッド"""
        # JANコードの処理
        jan_code = kwargs.get('jan_code') # jan_code: str | None
        
        # ProductDataオブジェクト作成
        return ProductData(
            name=self._get_nested_attr_or_key(item_info, 'itemName', ""),
            description=self._get_nested_attr_or_key(item_info, 'itemCaption', ""),
            image_url=self._get_nested_attr_or_key(item_info, 'mediumImageUrls[0].imageUrl', ""),
            manufacturer=self._get_nested_attr_or_key(item_info, 'shopName', ""),
            model_number="",
            jan_code=jan_code,
            price=int(self._get_nested_attr_or_key(item_info, 'itemPrice', 0)),
            points=int(self._get_nested_attr_or_key(item_info, 'itemPoints', 0)),
            effective_price=int(self._get_nested_attr_or_key(item_info, 'itemPrice', 0)),
            shipping_fee=0,
            condition=self._get_nested_attr_or_key(item_info, 'itemCondition.value', "").lower(),
            seller_name=self._get_nested_attr_or_key(item_info, 'shopName', ""),
            ec_product_id=self._get_nested_attr_or_key(item_info, 'itemCode', ""),
            product_url=self._get_nested_attr_or_key(item_info, 'itemUrl', ""),
            affiliate_url="",
            # 'affiliate_url': self._get_nested_attr(item_info, 'affiliateUrl', ""),
            ec_site='rakuten'
        )
    
class RakutenAPIException(APIException):
    status_code = 502  # Bad Gateway
    default_detail = '楽天APIとの通信に失敗しました。'
    default_code = 'rakuten_api_error'