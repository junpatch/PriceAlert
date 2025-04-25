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
            checkpoint_queries_stats("product取得")

        except Exception as e:
            logger.error(f"Productの保存に失敗しました: {e}")
            raise

        if not created:
            product = Product.objects.prefetch_related(
                'productonecsite_set', 
                'productonecsite_set__ec_site'
            ).get(pk=product.pk)
            if not product.image_url and fetched_product_info.get('image_url'):
                product.image_url = fetched_product_info.get('image_url')
            if not product.manufacturer and fetched_product_info.get('manufacturer'):
                product.manufacturer = fetched_product_info.get('manufacturer')
        checkpoint_queries_stats("product取得後")
        return product, created


    @staticmethod
    def save_user_product(product: Product, user_id: int, price_threshold: Optional[int]) -> Tuple[UserProduct, bool]:
        """ユーザーと商品を関連付け"""
        try:
            user_product, created = UserProduct.objects.get_or_create(
                user_id=user_id,
                product_id=product.pk,
                defaults={
                'notification_enabled': True,
                'display_order': 0,
                'price_threshold': price_threshold
                }
            )
            checkpoint_queries_stats("user_product作成")

        except Exception as e:
            logger.error(f"UserProductの保存に失敗しました: {e}")
            raise

        return user_product, created
    
    @staticmethod
    def save_product_on_ec_site_and_price_history(
        product: Product, 
        fetched_product_info: Dict[str, Any], 
        ec_site_cache: Dict[str, ECSite]
        ) -> Tuple[ProductOnECSite, bool, bool]:
        """
        ECサイト情報を保存し、必要に応じて価格履歴も記録する
        
        Args:
            product: 商品オブジェクト
            fetched_product_info: 取得した商品情報
            ec_site_cache: EC Siteオブジェクトのキャッシュ
        
        Returns:
            Tuple[ProductOnECSite, bool, bool]: 商品情報、新規作成されたかどうか、価格変更があったかどうか
        """
        ec_site_code = fetched_product_info.get('ec_site')
        if not ec_site_code:
            logger.error("ECサイトコードが取得できません")
            raise ValueError("ECサイトコードが取得できません")

        logger.debug(f"[SQL分析] save_product_on_ec_site_and_price_history開始 - EC: {ec_site_code}, 商品: {product.pk}")
        
        try:
            # EC Siteオブジェクトをキャッシュから取得または作成
            if ec_site_code not in ec_site_cache:
                logger.debug(f"[SQL分析] ECサイト取得: {ec_site_code} - キャッシュにないのでDBから取得")
                ec_site_cache[ec_site_code] = ECSite.objects.get(code=ec_site_code)
                checkpoint_queries_stats("ec_site取得")

            ec_site = ec_site_cache[ec_site_code]
            ec_product_id = fetched_product_info.get('ec_product_id')

            # 価格変更の検出と更新を1クエリで行う
            # 既存のレコードを取得し、価格変更を確認
            existing_product = ProductOnECSite.objects.filter(
                product=product,
                ec_site=ec_site,
                ec_product_id=ec_product_id
            ).only('current_price', 'effective_price').first()
            checkpoint_queries_stats("existing_product取得")
            
            is_price_changed = False
            if existing_product:
                current_price = fetched_product_info.get('price')
                effective_price = fetched_product_info.get('effective_price', current_price)
                is_price_changed = (
                    existing_product.current_price != current_price or
                    existing_product.effective_price != effective_price
                )

            # 更新用のデフォルト値を準備
            defaults = {
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

            # ProductOnECSiteの作成または更新

            print_queries()
            logger.info(f"[SQL分析] ProductOnECSiteの作成または更新開始 - 商品: {product.pk}, ECサイト: {ec_site.code}, EC商品ID: {ec_product_id}")
            product_on_ec_site, created = ProductOnECSite.objects.update_or_create(
                product_id=product.pk,
                ec_site_id=ec_site.pk,
                ec_product_id=ec_product_id,
                defaults=defaults
            )
            print_queries()

            if created:
                checkpoint_queries_stats("product_on_ec_site作成")
                logger.debug(f"[SQL分析] product_on_ec_siteを作成: {product_on_ec_site.pk}")
            else:
                checkpoint_queries_stats("product_on_ec_site更新")
                logger.debug(f"[SQL分析] product_on_ec_siteを更新: {product_on_ec_site.pk}")

            # 価格履歴の記録
            if created or is_price_changed:
                price_history = PriceHistory.objects.create(
                    product_on_ec_site=product_on_ec_site,
                    price=fetched_product_info.get('price'),
                    points=fetched_product_info.get('points', 0),
                    effective_price=fetched_product_info.get('effective_price', fetched_product_info.get('price')),
                    captured_at=timezone.now()
                )
                checkpoint_queries_stats("価格履歴作成")
                logger.debug(f"[SQL分析] 価格履歴を作成: {price_history.pk}")
            
            logger.debug(f"[SQL分析] save_product_on_ec_site_and_price_history完了 - created: {created}, price_changed: {is_price_changed}")
            return product_on_ec_site, created, is_price_changed
                
        except Exception as e:
            logger.error(f"ProductOnECSiteの処理でエラー: {e}")
            raise

    @staticmethod
    def _detect_price_change(product: Product, ec_site: ECSite, fetched_product_info: Dict[str, Any]) -> bool:
        """価格変更を検出するロジック"""
        ec_product_id = fetched_product_info.get('ec_product_id')
        logger.debug(f"[SQL分析] _detect_price_change開始 - EC: {ec_site.code}, 商品ID: {product.pk}")
        
        try:
            # 直接ECサイトオブジェクトを使用して検索
            product_on_ec_site = ProductOnECSite.objects.filter(
                product=product,
                ec_site=ec_site,
                ec_product_id=ec_product_id
            ).first()
            
            if product_on_ec_site and (
                product_on_ec_site.current_price != fetched_product_info.get('price') or
                product_on_ec_site.effective_price != fetched_product_info.get('effective_price')
            ):
                logger.debug(f"[SQL分析] 価格変更あり: 旧={product_on_ec_site.current_price}, 新={fetched_product_info.get('price')}")
                return True
            else:
                logger.debug(f"[SQL分析] 価格変更なし")
                return False
                
        except ECSite.DoesNotExist:
            logger.error(f"[SQL分析] ECサイトが見つかりません: {ec_site.code}")
            return True  # エラー時は安全のため履歴を作成                   
        except Exception as e:
            logger.error(f"価格変更の検出に失敗しました: {e}")
            return True  # エラーの場合は念のため履歴を保存

    @staticmethod
    def _update_ec_site_product(product: Product, fetched_product_info: Dict[str, Any], is_price_changed: bool) -> Tuple[ProductOnECSite, bool]:
        """ECサイト商品情報の更新/作成ロジック"""
        ec_site_code = fetched_product_info.get('ec_site')
        logger.debug(f"[SQL分析] update_ec_site_product開始 - EC: {ec_site_code}, 商品: {product.pk}")
        
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

        # 重複クエリ削減: 先にECサイトオブジェクトを取得して使用
        try:
            ec_site = ECSite.objects.get(code=ec_site_code)
            
            # ECサイトオブジェクトを直接使用して関連クエリを減らす
            try:
                # 既存レコードの検索
                product_on_ec_site = ProductOnECSite.objects.get(
                    product=product,
                    ec_site=ec_site,
                    ec_product_id=fetched_product_info.get('ec_product_id')
                )
                
                # 既存レコードを更新
                created = False
                for key, value in defaults.items():
                    setattr(product_on_ec_site, key, value)
                product_on_ec_site.save(update_fields=list(defaults.keys()))
                
            except ProductOnECSite.DoesNotExist:
                # 新規レコードを作成
                defaults.update({
                    'product': product,
                    'ec_site': ec_site,
                    'ec_product_id': fetched_product_info.get('ec_product_id')
                })
                product_on_ec_site = ProductOnECSite.objects.create(**defaults)
                created = True
                
            logger.debug(f"[SQL分析] update_ec_site_product完了 - EC: {ec_site_code}, 商品: {product.pk}, created: {created}")
            return product_on_ec_site, created
            
        except ECSite.DoesNotExist:
            logger.error(f"[SQL分析] ECサイトが見つかりません: {ec_site_code}")
            raise
    
    @staticmethod
    def _create_price_history(product_on_ec_site: ProductOnECSite, fetched_product_info: Dict[str, Any]) -> PriceHistory:
        # 価格履歴の作成ロジック
        return PriceHistory.objects.create(
            product_on_ec_site_id=product_on_ec_site.pk,
            price=fetched_product_info.get('price'),
            points=fetched_product_info.get('points', 0),
            effective_price=fetched_product_info.get('effective_price', fetched_product_info.get('price')),
            captured_at=timezone.now()
        )
    
def checkpoint_queries_stats(checkpoint_name):
    from .product_service import checkpoint_queries_stats
    checkpoint_queries_stats(checkpoint_name)

def print_queries():
    from .product_service import print_queries
    print_queries()
