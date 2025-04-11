from .base import ECConnector
from django.conf import settings
import requests
import re
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class RakutenConnector(ECConnector):

    def __init__(self):
        self.ec_site = "rakuten"
        self.api_key = settings.RAKUTEN_API_KEY
        self.api_secret = settings.RAKUTEN_API_SECRET
        self.affiliate_id = settings.RAKUTEN_AFFILIATE_ID

        self.request_url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

        self.params = {
            "applicationId": self.api_key,
            "affiliateId": self.affiliate_id,
            "format_version": "2",
        }

    def fetch_product_info(self, url=None, jan_code=None):
        """商品URLから情報を取得する"""
        logger.info("---Rakutenで検索開始---")
        params = self.params
        if jan_code:
            params["keyword"] = jan_code
        elif url:
            shop_code, item_code = self.extract_item_code_and_shop_code(url)
            if not item_code:
                logger.warning("URLから商品コードが見つかりませんでした")
                return None
            params["keyword"] = f"{item_code} {shop_code}"
        else:
            logger.error("URLかJANコードが指定されていません")
            return None

        response = requests.get(self.request_url, params=params)
        if response.status_code != 200:
            logger.error(f"APIレスポンスが異常です: {response.status_code}")
            return None

        response = response.json()
        items = response.get("Items", [])
        if not items:
            logger.error(f"APIレスポンスから商品情報が取得できませんでした: {params}")
            return None

        product_infos = []
        for item in items:
            item_info = item.get("Item", {})

            name = item_info.get("itemName", "")
            price = item_info.get("itemPrice", 0)
            description = item_info.get("itemCaption", "")
            affiliate_url = item_info.get("affiliateUrl", "")
            image_url = item_info.get("mediumImageUrls", [{}])[0].get("imageUrl", "")
            item_code = item_info.get("itemCode", "")
            url = item_info.get("itemUrl", "")

            manufacturer = ""
            model_number = ""

            # JANコードの取得
            if not jan_code:
                jan_code = self._find_jan_codes(item_info)
            else:
                jan_code = [int(jan_code)] if isinstance(jan_code, str) else jan_code

            product_infos.append({
                'name': name,
                'description': description,
                'image_url': image_url,
                'manufacturer': manufacturer,
                'model_number': model_number,
                'jan_code': jan_code,
                'price': price,
                'points': Decimal('0'),  # ポイント情報はPA APIでは取得が難しい場合がある
                'ec_product_id': item_code,
                'product_url': url,
                'affiliate_url': affiliate_url,
                'ec_site': 'rakuten'
            })

        return product_infos

    
    def fetch_price(self, url):
        """商品URLから価格情報のみ取得する"""
        pass


    def extract_item_code_and_shop_code(self, url):
        """商品URLから商品コードと店舗コードを抽出する"""
        item_code_match = re.search(r"rakuten.co.jp/([^/]+)\/([^/?]+)", url)
        if item_code_match:
            item_code = item_code_match.group(1)
            shop_code = item_code_match.group(2)
            return item_code, shop_code
        return None, None
 