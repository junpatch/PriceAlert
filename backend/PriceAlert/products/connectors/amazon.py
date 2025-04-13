from .base import ECConnector
from amazon.paapi import AmazonAPI
from django.conf import settings
import re
import logging
from amazon.paapi import AmazonException
from typing import List, Dict, Any, Optional, Union, Tuple

logger = logging.getLogger(__name__)

class AmazonConnector(ECConnector):

    def __init__(self):
        self.ec_site = "amazon"
        self.amazon_api = AmazonAPI(
            access_key = settings.AMAZON_API_KEY,
            secret_key = settings.AMAZON_API_SECRET,
            partner_tag = settings.AMAZON_ASSOCIATE_TAG,
            country="JP"
        )

    def search_by_url(self, url: str) -> List[Dict[str, Any]]:
        """URLから商品を検索する"""
        logger.debug('Amazon: URL検索を開始 - URL: %s', url)
        
        try:
            # ASINを抽出
            asin = self.extract_asin(url)
            if not asin:
                logger.warning('Amazon: URLからASINが見つかりませんでした - URL: %s', url)
                return []
            
            # 商品情報取得
            try:
                response = self.amazon_api.get_items(item_ids=[asin])
            except AmazonException as e:
                if "No results found" in str(e):
                    logger.warning("Amazon検索結果が見つかりませんでした: %s", e)
                    return []
                else:
                    logger.error("Amazon APIで予期しないエラー: %s", e)
                    raise
                    
            item = response.get("data", {}).get(asin)
            
            if not item:
                logger.warning('Amazon: 商品情報が取得できませんでした - ASIN: %s', asin)
                return []
            
            # 商品情報整形
            product_info = self._format_product_info(item, asin, url)
            
            return [product_info]
            
        except AmazonException as e:
            logger.warning('Amazon: API呼び出しエラー - URL: %s, エラー: %s', url, str(e))
            return []
        except Exception as e:
            logger.error('Amazon: URL検索中に予期せぬエラーが発生しました - URL: %s, エラー: %s', 
                        url, str(e), exc_info=True)
            return []
    
    def search_by_jan_code(self, jan_code: str) -> List[Dict[str, Any]]:
        """JANコードから商品を検索する"""
        logger.debug('Amazon: JANコード検索を開始 - JANコード: %s', jan_code)
        
        try:
            # JANコードで検索
            response = self.amazon_api.search_items(keywords=jan_code)
            items = response.get("data", [])
            
            if not items:
                logger.warning('Amazon: JANコードでの検索結果が見つかりませんでした - JANコード: %s', jan_code)
                return []
            
            result: List[Dict[str, Any]] = []
            # 検索結果上位5件までを処理
            for item in items:
                asin = item.asin if hasattr(item, 'asin') else None
                url = item.detail_page_url if hasattr(item, 'detail_page_url') else None
                
                if not asin or not url:
                    continue
                
                # 商品情報整形
                product_info = self._format_product_info(item, asin, url, jan_code)
                result.append(product_info)
            
            return result
            
        except AmazonException as e:
            logger.warning('Amazon: API呼び出しエラー - JANコード: %s, エラー: %s', jan_code, str(e))
            return []
        except Exception as e:
            logger.error('Amazon: JANコード検索中に予期せぬエラーが発生しました - JANコード: %s, エラー: %s', 
                       jan_code, str(e), exc_info=True)
            return []

    def extract_asin(self, url: str) -> Optional[str]:
        """商品URLからASINを抽出する"""
        asin_match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
        if asin_match:
            return asin_match.group(1)
        return None
    
    def fetch_price(self, url: str) -> Dict[str, Any]:
        """商品URLから価格情報のみ取得する"""
        # 未実装
        return {}
    
    def _format_product_info(self, item: Any, asin: str, url: str, jan_code: Optional[List[str | None] | str | None] = None) -> Dict[str, Any]:
        """商品情報を整形する共通メソッド"""
        # 価格情報抽出
        if not jan_code:
            jan_code = self._get_nested_attr_or_key(item, 'item_info._external_ids.ea_ns.display_values', [])

        result = {
            'ec_product_id': asin,
            'price': int(self._get_nested_attr_or_key(item, 'offers.listings[0].price.amount', 0)),
            'points': int(self._get_nested_attr_or_key(item, 'offers.listings[0].loyalty_points.points', 0)),
            'condition': self._get_nested_attr_or_key(item, 'offers.listings[0].condition.value', "").lower(),
            'seller_name': self._get_nested_attr_or_key(item, 'offers.listings[0].merchant_info.name', ""),
            'shipping_fee': 0,
            'name': self._get_nested_attr_or_key(item, 'item_info.title.display_value', "不明な商品"),
            'description': "\n".join(self._get_nested_attr_or_key(item, 'item_info.features.display_values', "")),
            'manufacturer': self._get_nested_attr_or_key(item, 'item_info.by_line_info.brand.display_value', ""),
            'image_url': self._get_nested_attr_or_key(item, 'images.primary.large.url', ""),
            'model_number': self._get_nested_attr_or_key(item, 'item_info.model_number.display_value', ""),
            'jan_code': jan_code,
            'product_url': f"https://www.amazon.co.jp/dp/{asin}",
            'affiliate_url': "",
            # affiliate_url: f"{product_url}/?tag={settings.AMAZON_ASSOCIATE_TAG}"
            'ec_site': 'amazon'
        }

        return result