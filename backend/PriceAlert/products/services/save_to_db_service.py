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
            product = Product.objects.prefetch_related(
                'productonecsite_set', 
                'productonecsite_set__ec_site'
            ).get(pk=product.pk)
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
                product_id=product.pk,
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
    
    # @staticmethod
    # def save_product_on_ec_site_and_price_history(
    #     product: Product, 
    #     fetched_product_info: Dict[str, Any], 
    #     ec_site_cache: Dict[str, ECSite]
    #     ) -> Tuple[ProductOnECSite, bool, bool]:
    #     """
    #     ECサイト情報を保存し、必要に応じて価格履歴も記録する
        
    #     Args:
    #         product: 商品オブジェクト
    #         fetched_product_info: 取得した商品情報
    #         ec_site_cache: EC Siteオブジェクトのキャッシュ
        
    #     Returns:
    #         Tuple[ProductOnECSite, bool, bool]: 商品情報、新規作成されたかどうか、価格変更があったかどうか
    #     """
    #     ec_site_code = fetched_product_info.get('ec_site')
    #     if not ec_site_code:
    #         logger.error("ECサイトコードが取得できません")
    #         raise ValueError("ECサイトコードが取得できません")

    #     try:
    #         # EC Siteオブジェクトをキャッシュから取得または作成
    #         if ec_site_code not in ec_site_cache:
    #             ec_site_cache[ec_site_code] = ECSite.objects.get(code=ec_site_code)

    #         ec_site = ec_site_cache[ec_site_code]
    #         ec_product_id = fetched_product_info.get('ec_product_id')

    #         # 価格変更の検出と更新を1クエリで行う
    #         # 既存のレコードを取得し、価格変更を確認
    #         existing_product = ProductOnECSite.objects.filter(
    #             product=product,
    #             ec_site=ec_site,
    #             ec_product_id=ec_product_id
    #         ).only('current_price', 'effective_price').first()
            
    #         is_price_changed = False
    #         if existing_product:
    #             current_price = fetched_product_info.get('price')
    #             effective_price = fetched_product_info.get('effective_price', current_price)
    #             is_price_changed = (
    #                 existing_product.current_price != current_price or
    #                 existing_product.effective_price != effective_price
    #             )

    #         # 更新用のデフォルト値を準備
    #         defaults = {
    #             'seller_name': fetched_product_info.get('seller_name'),
    #             'product_url': fetched_product_info.get('product_url'),
    #             'affiliate_url': fetched_product_info.get('affiliate_url'),
    #             'current_price': fetched_product_info.get('price'),
    #             'current_points': fetched_product_info.get('points', 0),
    #             'shipping_fee': fetched_product_info.get('shipping_fee', 0),
    #             'effective_price': fetched_product_info.get('effective_price', fetched_product_info.get('price')),
    #             'condition': fetched_product_info.get('condition'),
    #             'is_active': True
    #         }

    #         if is_price_changed:
    #             defaults['last_updated'] = timezone.now()

    #         # ProductOnECSiteの作成または更新
    #         product_on_ec_site, created = ProductOnECSite.objects.update_or_create(
    #             product_id=product.pk,
    #             ec_site_id=ec_site.pk,
    #             ec_product_id=ec_product_id,
    #             defaults=defaults
    #         )

    #         # 価格履歴の記録
    #         if created or is_price_changed:
    #             price_history = PriceHistory.objects.create(
    #                 product_on_ec_site=product_on_ec_site,
    #                 price=fetched_product_info.get('price'),
    #                 points=fetched_product_info.get('points', 0),
    #                 effective_price=fetched_product_info.get('effective_price', fetched_product_info.get('price')),
    #                 captured_at=timezone.now()
    #             )

    #         return product_on_ec_site, created, is_price_changed
                
    #     except Exception as e:
    #         logger.error(f"ProductOnECSiteの処理でエラー: {e}")
    #         raise

    @staticmethod
    def save_product_on_ec_site_and_price_history_batch(
        products_info: List[Tuple[Product, Dict[str, Any]]], 
        ec_site_cache: Dict[str, ECSite]
    ) -> List[Tuple[ProductOnECSite, bool, bool]]:
        """EC商品情報と価格履歴を一括で処理する最適化版"""
        
        # 1. 関連する既存レコードを一括取得
        product_ids = [p.pk for p, _ in products_info]
        
        # ECサイトコードを収集（Noneを除外）
        needed_ec_site_codes = set()
        for _, info in products_info:
            ec_site_code = info.get('ec_site')
            if ec_site_code:  # Noneチェック
                needed_ec_site_codes.add(ec_site_code)
        
        # キャッシュにないECサイトを取得してキャッシュに追加
        missing_ec_codes = [code for code in needed_ec_site_codes if code not in ec_site_cache]
        if missing_ec_codes:
            for ec_site in ECSite.objects.filter(code__in=missing_ec_codes):
                ec_site_cache[ec_site.code] = ec_site
        # ECサイトIDを取得（すべてキャッシュから）
        ec_site_ids = []
        for code in needed_ec_site_codes:
            if code in ec_site_cache:
                ec_site_ids.append(ec_site_cache[code].pk)
        
        # ProductOnECSiteを一括取得して辞書化
        existing_products = {}
        
        # ec_site_idsとproduct_idsが空でない場合のみクエリを実行
        if product_ids and ec_site_ids:
            product_on_ec_list = ProductOnECSite.objects.filter(
                product_id__in=product_ids,
                ec_site_id__in=ec_site_ids
            ).select_related('product', 'ec_site')
            for product_on_ec in product_on_ec_list:
                key = (product_on_ec.product.pk, product_on_ec.ec_site.pk, product_on_ec.ec_product_id)
                existing_products[key] = product_on_ec

        # 2. 更新と作成を分離
        to_update = []
        to_create = []
        price_histories = []
        results = []
        
        now = timezone.now()
        
        for product, fetched_info in products_info:
            ec_site_code = fetched_info.get('ec_site')
            if not ec_site_code or ec_site_code not in ec_site_cache:
                continue
            
            ec_site = ec_site_cache[ec_site_code]
            ec_product_id = fetched_info.get('ec_product_id')
            key = (product.pk, ec_site.pk, ec_product_id)
            
            # 共通のデータ設定
            data = {
                'seller_name': fetched_info.get('seller_name'),
                'product_url': fetched_info.get('product_url'),
                'affiliate_url': fetched_info.get('affiliate_url'),
                'current_price': fetched_info.get('price'),
                'current_points': fetched_info.get('points', 0),
                'shipping_fee': fetched_info.get('shipping_fee', 0),
                'effective_price': fetched_info.get('effective_price', fetched_info.get('price')),
                'condition': fetched_info.get('condition'),
                'is_active': True
            }
            
            if key in existing_products:
                # 更新対象
                existing = existing_products[key]
                created = False
                is_price_changed = (
                    existing.current_price != data['current_price'] or
                    existing.effective_price != data['effective_price']
                )
                
                if is_price_changed:
                    data['last_updated'] = now
                    # 価格履歴の記録
                    price_histories.append(PriceHistory(
                        product_on_ec_site=existing,
                        price=data['current_price'],
                        points=data['current_points'],
                        effective_price=data['effective_price'],
                        captured_at=now
                    ))
                # 更新対象オブジェクトに変更を適用
                for key, value in data.items():
                    setattr(existing, key, value)
                to_update.append(existing)
                results.append((existing, created, is_price_changed))
            else:
                # 新規作成対象
                created = True
                is_price_changed = True
                
                new_product_on_ec = ProductOnECSite(
                    product=product,
                    ec_site=ec_site,
                    ec_product_id=ec_product_id,
                    last_updated=now,
                    **data
                )
                to_create.append(new_product_on_ec)
                results.append((new_product_on_ec, created, is_price_changed))

        # 3. 一括処理の実行
        if to_update:
            fields = list(data.keys()) + ['last_updated']
            ProductOnECSite.objects.bulk_update(to_update, fields)
        if to_create:
            created_products = ProductOnECSite.objects.bulk_create(to_create)
            # 新規作成された商品のIDを使って価格履歴を作成
            for i, new_product in enumerate(created_products):
                price_histories.append(PriceHistory(
                    product_on_ec_site=new_product,
                    price=new_product.current_price,
                    points=new_product.current_points,
                    effective_price=new_product.effective_price,
                    captured_at=now
                ))
        
        # 4. 価格履歴を一括作成
        if price_histories:
            PriceHistory.objects.bulk_create(price_histories)
        
        return results

    # @staticmethod
    # def _detect_price_change(product: Product, ec_site: ECSite, fetched_product_info: Dict[str, Any]) -> bool:
    #     """価格変更を検出するロジック"""
    #     ec_product_id = fetched_product_info.get('ec_product_id')
        
    #     try:
    #         # 直接ECサイトオブジェクトを使用して検索
    #         product_on_ec_site = ProductOnECSite.objects.filter(
    #             product=product,
    #             ec_site=ec_site,
    #             ec_product_id=ec_product_id
    #         ).first()
            
    #         if product_on_ec_site and (
    #             product_on_ec_site.current_price != fetched_product_info.get('price') or
    #             product_on_ec_site.effective_price != fetched_product_info.get('effective_price')
    #         ):
    #             return True
    #         else:
    #             return False
                
    #     except ECSite.DoesNotExist:
    #         return True  # エラー時は安全のため履歴を作成                   
    #     except Exception as e:
    #         logger.error(f"価格変更の検出に失敗しました: {e}")
    #         return True  # エラーの場合は念のため履歴を保存

    # @staticmethod
    # def _update_ec_site_product(product: Product, fetched_product_info: Dict[str, Any], is_price_changed: bool) -> Tuple[ProductOnECSite, bool]:
    #     """ECサイト商品情報の更新/作成ロジック"""
    #     ec_site_code = fetched_product_info.get('ec_site')
        
    #     defaults={
    #         'seller_name': fetched_product_info.get('seller_name'),
    #         'product_url': fetched_product_info.get('product_url'),
    #         'affiliate_url': fetched_product_info.get('affiliate_url'),
    #         'current_price': fetched_product_info.get('price'),
    #         'current_points': fetched_product_info.get('points', 0),
    #         'shipping_fee': fetched_product_info.get('shipping_fee', 0),
    #         'effective_price': fetched_product_info.get('effective_price', fetched_product_info.get('price')),
    #         'condition': fetched_product_info.get('condition'),
    #         'is_active': True
    #     }

    #     if is_price_changed:
    #         defaults['last_updated'] = timezone.now()

    #     # 重複クエリ削減: 先にECサイトオブジェクトを取得して使用
    #     try:
    #         ec_site = ECSite.objects.get(code=ec_site_code)
            
    #         # ECサイトオブジェクトを直接使用して関連クエリを減らす
    #         try:
    #             # 既存レコードの検索
    #             product_on_ec_site = ProductOnECSite.objects.get(
    #                 product=product,
    #                 ec_site=ec_site,
    #                 ec_product_id=fetched_product_info.get('ec_product_id')
    #             )
                
    #             # 既存レコードを更新
    #             created = False
    #             for key, value in defaults.items():
    #                 setattr(product_on_ec_site, key, value)
    #             product_on_ec_site.save(update_fields=list(defaults.keys()))
                
    #         except ProductOnECSite.DoesNotExist:
    #             # 新規レコードを作成
    #             defaults.update({
    #                 'product': product,
    #                 'ec_site': ec_site,
    #                 'ec_product_id': fetched_product_info.get('ec_product_id')
    #             })
    #             product_on_ec_site = ProductOnECSite.objects.create(**defaults)
    #             created = True
                
    #         return product_on_ec_site, created
            
    #     except ECSite.DoesNotExist:
    #         logger.error(f"ECサイトが見つかりません: {ec_site_code}")
    #         raise
    
    # @staticmethod
    # def _create_price_history(product_on_ec_site: ProductOnECSite, fetched_product_info: Dict[str, Any]) -> PriceHistory:
    #     # 価格履歴の作成ロジック
    #     return PriceHistory.objects.create(
    #         product_on_ec_site_id=product_on_ec_site.pk,
    #         price=fetched_product_info.get('price'),
    #         points=fetched_product_info.get('points', 0),
    #         effective_price=fetched_product_info.get('effective_price', fetched_product_info.get('price')),
    #         captured_at=timezone.now()
    #     )
    
def checkpoint_queries_stats(checkpoint_name):
    from .product_service import checkpoint_queries_stats
    checkpoint_queries_stats(checkpoint_name)

def print_queries():
    from .product_service import print_queries
    print_queries()
