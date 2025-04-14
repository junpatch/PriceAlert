from abc import ABC, abstractmethod
import re
from typing import List, Dict, Any, Optional, Union, TypeVar, cast, Set
from dataclasses import dataclass

# 商品情報のデータクラス
@dataclass
class ProductData:
    """ECサイトから取得した商品情報を格納するデータクラス"""
    name: str
    description: str = ""
    image_url: str = ""
    manufacturer: str = ""
    model_number: str = ""
    jan_code: Optional[str] = None
    price: int = 0
    points: int = 0
    effective_price: int = 0
    shipping_fee: int = 0
    condition: str = ""
    seller_name: str = ""
    ec_product_id: str = ""
    product_url: str = ""
    affiliate_url: str = ""
    ec_site: str = ""

    def __post_init__(self):
        # 有効価格が設定されていない場合は価格を設定
        if not self.effective_price and self.price:
            self.effective_price = self.price

    def to_dict(self) -> Dict[str, Any]:
        """データクラスを辞書に変換"""
        return {
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'manufacturer': self.manufacturer,
            'model_number': self.model_number,
            'jan_code': self.jan_code,
            'price': self.price,
            'points': self.points,
            'effective_price': self.effective_price,
            'shipping_fee': self.shipping_fee,
            'condition': self.condition,
            'seller_name': self.seller_name,
            'ec_product_id': self.ec_product_id,
            'product_url': self.product_url,
            'affiliate_url': self.affiliate_url,
            'ec_site': self.ec_site
        }

# 基底コネクタクラス
class ECConnector(ABC):
    """ECサイト接続の基底クラス"""
    
    def __init__(self, ec_site_code: str):
        """
        Args:
            ec_site_code: ECサイトのコード (amazon, rakuten, yahoo など)
        """
        self.ec_site_code = ec_site_code
    
    @abstractmethod
    def fetch_price(self, url: str) -> Optional[ProductData]:
        """商品URLから価格情報のみ取得する"""
        pass
    
    @abstractmethod
    def search_by_url(self, url: str) -> Set[str]:
        """URLから商品を検索する"""
        pass
    
    @abstractmethod
    def search_by_jan_code(self, jan_code: str) -> List[ProductData]:
        """JANコードから商品を検索する"""
        pass
        
    @abstractmethod
    def _extract_product_id(self, url: str) -> Optional[str]:
        """商品URLから商品IDを抽出する"""
        pass

    def _find_jan_codes(self, data: Any) -> Set[str]:
        """JANコードを抽出する"""
        jan_codes: Set[str] = set()

        if isinstance(data, dict):
            for value in data.values():
                jan_codes.update(self._find_jan_codes(value))

        elif isinstance(data, list):
            for item in data:
                jan_codes.update(self._find_jan_codes(item))

        elif isinstance(data, str) or isinstance(data, int):
            jan_codes.update(re.findall(r'\b\d{13}\b', str(data)))

        return jan_codes
    
    def _get_nested_attr_or_key(self, obj: Any, path: str, default: Any = None) -> Any:
        """
        ネストされた属性・辞書キーを安全に取得する。
        例: 'offers.listings[0].price.amount'
        """
        try:
            for part in path.split('.'):
                if '[' in part and ']' in part:
                    name, index = part.rstrip(']').split('[')
                    obj = self._resolve_attr_or_key(obj, name)
                    obj = obj[int(index)]
                else:
                    obj = self._resolve_attr_or_key(obj, part)
            return obj
        except (AttributeError, IndexError, KeyError, TypeError, ValueError):
            return default

    def _resolve_attr_or_key(self, obj: Any, name: str) -> Any:
        """オブジェクトの属性または dict のキーを取得（存在しない場合は例外）"""
        if isinstance(obj, dict):
            return obj[name]  # ← KeyErrorが起こるのが望ましい
        return getattr(obj, name)  # ← AttributeErrorが起こるのが望ましい
        
    def _format_product_data(self, item: Dict[str, Any], **kwargs) -> ProductData:
        """辞書からProductDataオブジェクトを生成する共通メソッド"""
        # サブクラスで実装すべき
        raise NotImplementedError("サブクラスで実装してください")
