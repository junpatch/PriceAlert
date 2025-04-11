from .base import ECConnector
from amazon.paapi import AmazonAPI
from decimal import Decimal
from django.conf import settings
import re
import logging
from amazon.paapi import AmazonException

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

    def fetch_product_info(self, url=None, jan_code=None):
        """商品URLから情報を取得する"""
        logger.info("---Amazonで検索開始---")
        if url:
            asin = self.extract_asin(url)
            if not asin:
                logger.warning("URLからASINが見つかりませんでした - URL: %s", url)
                return None
            response = self.amazon_api.get_items(
                item_ids=[asin]
            )
            item = response.get("data", {}).get(asin)
            if hasattr(item.item_info._external_ids, 'ea_ns') and item.item_info._external_ids.ea_ns:
                jan_code = [int(code) for code in item.item_info._external_ids.ea_ns.display_values]

        elif jan_code:
            try:
                response = self.amazon_api.search_items(
                    keywords=jan_code
                )
            except AmazonException as e:    
                if "No results found" in str(e):
                    logger.warning("Amazon検索結果が見つかりませんでした: %s", e)
                    return None
                else:
                    logger.error("Amazon APIで予期しないエラー: %s", e)
                    raise

            item = response.get("data", {})[0]
            if hasattr(item, 'asin'):
                asin = item.asin
            if hasattr(item, 'detail_page_url'):
                url = item.detail_page_url
        else:
            logger.error("URLかJANコードが指定されていません")
            return None
        
        if not item:
            logger.warning("商品情報が取得できませんでした - ASIN: %s, JANコード: %s", asin, jan_code)
            return None
  
        # 価格情報抽出
        price = Decimal('0')
        if hasattr(item, 'offers') and item.offers and item.offers.listings:
            price_obj = item.offers.listings[0].price
            price = Decimal(str(price_obj.amount))
        
        # 商品情報を構造化
        name = item.item_info.title.display_value if hasattr(item.item_info, 'title') else "不明な商品"
        
        description = ""
        if hasattr(item.item_info, 'features') and item.item_info.features:
            description = "\n".join(item.item_info.features.display_values)
        
        manufacturer = ""
        if hasattr(item.item_info, 'by_line_info') and item.item_info.by_line_info.brand:
            manufacturer = item.item_info.by_line_info.brand.display_value
        
        image_url = ""
        if hasattr(item, 'images') and item.images and item.images.primary:
            image_url = item.images.primary.large.url
        
        # 型番やJANコードの取得（可能な場合）
        model_number = ""
        
        # アフィリエイトURL生成
        affiliate_url = f"https://www.amazon.co.jp/dp/{asin}/?tag={settings.AMAZON_ASSOCIATE_TAG}"
        
        return [{
            'name': name,
            'description': description,
            'image_url': image_url,
            'manufacturer': manufacturer,
            'model_number': model_number,
            'jan_code': [int(jan_code)] if isinstance(jan_code, str) else jan_code,
            'price': price,
            'points': Decimal('0'),  # ポイント情報はPA APIでは取得が難しい場合がある
            'ec_product_id': asin,
            'product_url': url,
            'affiliate_url': affiliate_url,
            'ec_site': 'amazon'
        }]

    def extract_asin(self, url):
        """商品URLからASINを抽出する"""
        asin_match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
        if asin_match:
            return asin_match.group(1)
        return None
    
    def fetch_price(self, url):
        """商品URLから価格情報のみ取得する"""
        pass