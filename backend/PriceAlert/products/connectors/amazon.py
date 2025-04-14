from .base import ECConnector, ProductData
from amazon.paapi import AmazonAPI
from django.conf import settings
import re
import logging
from amazon.paapi import AmazonException
from typing import List, Dict, Any, Optional, Union, Tuple, Set

logger = logging.getLogger(__name__)

class AmazonConnector(ECConnector):
    """Amazon用コネクタ"""

    def __init__(self):
        super().__init__(ec_site_code="amazon")
        self.amazon_api = AmazonAPI(
            access_key = settings.AMAZON_API_KEY,
            secret_key = settings.AMAZON_API_SECRET,
            partner_tag = settings.AMAZON_ASSOCIATE_TAG,
            country="JP"
        )

    def search_by_url(self, url: str) -> Set[str]:
        """URLから商品を検索する"""
        logger.debug('Amazon: URL検索を開始 - URL: %s', url)
        
        try:
            # ASINを抽出
            asin = self._extract_product_id(url)
            if not asin:
                logger.warning('Amazon: URLからASINが見つかりませんでした - URL: %s', url)
                return set()
            
            # 商品情報取得
            response = self.amazon_api.get_items(item_ids=[asin])
                    
            item = response.get("data", {}).get(asin)
            if not item:
                logger.warning('Amazon: 商品情報が取得できませんでした - ASIN: %s', asin)
                return set()

            jan_code = self._get_nested_attr_or_key(item, 'item_info._external_ids.ea_ns.display_values', []) # List[str]
            jan_codes = set(jan_code)
            logger.info(f'Amazon: {len(jan_codes)}件のJANコードが見つかりました: {jan_codes}')

            return jan_codes
            
        except AmazonException as e:
            if "No results found" in str(e):
                return set()
            logger.warning('Amazon: APIで予期しないエラー: %s', e)
            return set()
        except Exception as e:
            logger.error('Amazon: URL検索中に予期せぬエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            return set()
    
    def search_by_jan_code(self, jan_code: str) -> List[ProductData]:
        """JANコードから商品を検索する"""
        logger.debug('Amazon: JANコード検索を開始 - JANコード: %s', jan_code)
        
        try:
            # JANコードで検索
            response = self.amazon_api.search_items(keywords=jan_code)
            items = response.get("data")
            
            if not items:
                # アイテムが見つからない：検索を続行させるためエラーハンドリングしない
                return []
            
            result: List[ProductData] = []

            for item in items:
                # レスポンスのJANコードと一致しない場合はスキップ
                jan_from_item = self._get_nested_attr_or_key(item, 'item_info._external_ids.ea_ns.display_values', [])
                if not jan_code in jan_from_item:
                    continue

                asin = item.asin if hasattr(item, 'asin') else None
                url = item.detail_page_url if hasattr(item, 'detail_page_url') else None
                
                if not asin or not url:
                    continue
                
                # 商品情報整形
                product_data = self._format_product_data(item, asin=asin, url=url, jan_code=jan_code)
                result.append(product_data)
            
            return result
            
        except AmazonException as e:
            if "No results found" in str(e):
                return []
            else:
                logger.error("Amazon:APIで予期しないエラー: %s", e)
                return []
        except Exception as e:
            logger.error('Amazon: JANコード検索中に予期せぬエラーが発生しました - JANコード: %s, エラー: %s', 
                       jan_code, str(e), exc_info=True)
            return []

    def _extract_product_id(self, url: str) -> Optional[str]:
        """商品URLからASINを抽出する"""
        asin_match = re.search(r"/[dg]p/(?:product|aw/d/)?([A-Z0-9]{10})/?", url)
        if asin_match:
            return asin_match.group(1)
        return None
    
    def fetch_price(self, url: str) -> Optional[ProductData]:
        """商品URLから価格情報のみ取得する"""
        # 未実装のため、URLから商品検索して最初の結果を返す
        return None
    
    def _format_product_data(self, item: Any, **kwargs) -> ProductData:
        """商品情報を整形する共通メソッド"""
        # 引数からデータ取得
        asin = kwargs.get('asin')
        url = kwargs.get('url')
        jan_code = kwargs.get('jan_code')

        return ProductData(
            name=self._get_nested_attr_or_key(item, 'item_info.title.display_value', "不明な商品"),
            description="\n".join(self._get_nested_attr_or_key(item, 'item_info.features.display_values', [])),
            image_url=self._get_nested_attr_or_key(item, 'images.primary.large.url', ""),
            manufacturer=self._get_nested_attr_or_key(item, 'item_info.by_line_info.brand.display_value', ""),
            model_number=self._get_nested_attr_or_key(item, 'item_info.model_number.display_value', ""),
            jan_code=jan_code,
            price=int(self._get_nested_attr_or_key(item, 'offers.listings[0].price.amount', 0)),
            points=int(self._get_nested_attr_or_key(item, 'offers.listings[0].loyalty_points.points', 0)),
            effective_price=int(self._get_nested_attr_or_key(item, 'offers.listings[0].price.amount', 0)),
            shipping_fee=0,
            condition=self._get_nested_attr_or_key(item, 'offers.listings[0].condition.value', "").lower(),
            seller_name=self._get_nested_attr_or_key(item, 'offers.listings[0].merchant_info.name', ""),
            ec_product_id=asin or "",
            product_url=url or f"https://www.amazon.co.jp/dp/{asin}" if asin else "",
            affiliate_url="",
            # affiliate_url: f"{product_url}/?tag={settings.AMAZON_ASSOCIATE_TAG}"
            ec_site='amazon'
        )