import logging
from django.utils import timezone
from typing import List, Dict, Any, Optional, Tuple
from django.db import transaction
from ..models import ECSite, ProductOnECSite, PriceHistory, Product, UserProduct

logger = logging.getLogger('products')

class SaveToDBService:
    """DBに保存するためのサービス"""
    @staticmethod
    def save_product(fetched_product_info: Dict[str, Any]) -> Tuple[Product, bool]:
        """検索結果をDBに保存して、製品オブジェクトを返す"""

        # 商品の保存
        jan_code = fetched_product_info.get('jan_code') # jan_code: str | None
        model_number = fetched_product_info.get('model_number')
        
        try:
            product, created = Product.objects.get_or_create(
                jan_code=jan_code,
                model_number=model_number,
                defaults={
                    'name': fetched_product_info.get('name'),
                    'description': fetched_product_info.get('description'),
                    'image_url': fetched_product_info.get('image_url'),
                    'manufacturer': fetched_product_info.get('manufacturer'),
                }
            )
        except Exception as e:
            logger.error(f"Productの保存に失敗しました: {e}")
            raise

        if not created:
            if not product.image_url and fetched_product_info.get('image_url'):
                product.image_url = fetched_product_info.get('image_url')
            if not product.manufacturer and fetched_product_info.get('manufacturer'):
                product.manufacturer = fetched_product_info.get('manufacturer')
                
        return product, created


    @staticmethod
    def save_user_product(product: Product, user_id: int, price_threshold: Optional[int]) -> Tuple[UserProduct, bool]:
        """ユーザーと商品を関連付け"""
        try:
            user_product, created = UserProduct.objects.get_or_create(
                user_id=user_id,
                product=product,
                defaults={
                'notification_enabled': True,
                'display_order': 0,
                'price_threshold': price_threshold
                }
            )
        except Exception as e:
            logger.error(f"UserProductの保存に失敗しました: {e}")
            raise

        return user_product, created
    
    @staticmethod
    def save_product_on_ec_site_and_price_history(product: Product, fetched_product_info: Dict[str, Any]) -> Tuple[ProductOnECSite, bool, bool]:
        """
        ECサイト情報を保存し、必要に応じて価格履歴も記録する
        
        Returns:
            Tuple[ProductOnECSite, bool, bool]: 商品情報、新規作成されたかどうか、価格変更があったかどうか
        """
        # 価格変更の検出ロジック
        is_price_changed = SaveToDBService._detect_price_change(product, fetched_product_info)
        
        # ECサイト商品情報の更新/作成
        try:
            product_on_ec_site, created = SaveToDBService._update_ec_site_product(product, fetched_product_info, is_price_changed)
        except Exception as e:
            logger.error(f"ProductOnECSiteの保存に失敗しました: {e}")
            raise
        
        # 価格履歴の記録
        if created or is_price_changed:
            try:
                price_history = SaveToDBService._create_price_history(product_on_ec_site, fetched_product_info)
            except Exception as e:
                logger.error(f"PriceHistoryの保存に失敗しました: {e}")
                raise
            
        return product_on_ec_site, created, is_price_changed
    
    @staticmethod
    def _detect_price_change(product, fetched_product_info):
        # 価格変更の検出ロジック
        try:
            product_on_ec_site = ProductOnECSite.objects.filter(
                product=product,
                ec_site=ECSite.objects.get(code=fetched_product_info.get('ec_site')),
                ec_product_id=fetched_product_info.get('ec_product_id')
            ).first()
            
            if product_on_ec_site and (
                product_on_ec_site.current_price != fetched_product_info.get('price') or
                product_on_ec_site.effective_price != fetched_product_info.get('effective_price')
            ):
                return True
            return False
        except Exception:
            return True  # エラーの場合は念のため履歴を保存

    @staticmethod
    def _update_ec_site_product(product: Product, fetched_product_info: Dict[str, Any], is_price_changed: bool) -> Tuple[ProductOnECSite, bool]:
        # ECサイト商品情報の更新/作成ロジック
        defaults={
            'seller_name': fetched_product_info.get('seller_name'),
            'product_url': fetched_product_info.get('product_url'),
            'affiliate_url': fetched_product_info.get('affiliate_url'),
            'current_price': fetched_product_info.get('price'),
            'current_points': fetched_product_info.get('points', 0),
            'shipping_fee': fetched_product_info.get('shipping_fee', 0),
            'effective_price': fetched_product_info.get('effective_price', fetched_product_info.get('price')),
            'condition': fetched_product_info.get('condition'),
            'is_active': True
        }

        if is_price_changed:
            defaults['last_updated'] = timezone.now()

        return ProductOnECSite.objects.update_or_create(
            product=product,
            ec_site=ECSite.objects.get(code=fetched_product_info.get('ec_site')),
            ec_product_id=fetched_product_info.get('ec_product_id'),
            defaults=defaults
        )
    
    @staticmethod
    def _create_price_history(product_on_ec_site: ProductOnECSite, fetched_product_info: Dict[str, Any]) -> PriceHistory:
        # 価格履歴の作成ロジック
        return PriceHistory.objects.create(
            product_on_ec_site=product_on_ec_site,
            price=fetched_product_info.get('price'),
            points=fetched_product_info.get('points', 0),
            effective_price=fetched_product_info.get('effective_price', fetched_product_info.get('price')),
            captured_at=timezone.now()
        )