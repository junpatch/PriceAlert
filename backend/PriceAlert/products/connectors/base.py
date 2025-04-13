from abc import ABC, abstractmethod
import re
from typing import List, Dict, Any

class ECConnector(ABC):
    """ECサイト接続の基底クラス"""
    @abstractmethod
    def fetch_price(self, url: str) -> Dict[str, Any]:
        """商品URLから価格情報のみ取得する"""
        pass
    
    @abstractmethod
    def search_by_url(self, url: str) -> List[Dict[str, Any]]:
        """URLから商品を検索する"""
        pass
    
    @abstractmethod
    def search_by_jan_code(self, jan_code: str) -> List[Dict[str, Any]]:
        """JANコードから商品を検索する"""
        pass

    def _find_jan_codes(self, data: Any) -> List[str]:
        """JANコードを抽出する"""
        jan_codes: List[str] = []

        if isinstance(data, dict):
            for value in data.values():
                jan_codes.extend(self._find_jan_codes(value))

        elif isinstance(data, list):
            for item in data:
                jan_codes.extend(self._find_jan_codes(item))

        elif isinstance(data, str):
            jan_codes.extend(re.findall(r'\b\d{13}\b', data))

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
