import logging

from rest_framework import status, permissions, serializers, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Product, UserProduct, ProductOnECSite, PriceHistory
from .serializers import ProductSerializer, UserProductSerializer, ProductOnECSiteSerializer, ProductRegistrationSerializer, PriceHistorySerializer
from .services.product_service import ProductService
from .tasks import fetch_and_store_prices
from notifications.tasks import check_price_alerts, send_price_alert_notifications


logger = logging.getLogger('products.views')

class ProductViewSet(viewsets.ViewSet):
    """
    商品操作のAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # GET: products/
    def list(self, request):
        """商品一覧を返す GET: products/"""
        logger.info('商品一覧の取得を開始 - ユーザー: %s', request.user.username)
        try:
            # TODO: ユーザーの商品のみ表示になっているので要修正
            queryset = Product.objects.filter(userproduct__user=request.user).distinct()
            serializer = ProductSerializer(queryset, many=True)
            logger.debug('商品一覧を取得しました - 件数: %d', len(serializer.data))
            return Response(serializer.data)
        except Exception as e:
            logger.error('商品一覧の取得中にエラーが発生しました - ユーザー: %s, エラー: %s', 
                        request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # GET: products/{pk}/
    def retrieve(self, request, pk=None):
        """特定の商品の詳細を返す GET: products/{pk}/"""
        logger.info('商品詳細の取得を開始 - 商品ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            # TODO: ユーザーの商品のみ表示になっているので要修正
            product = get_object_or_404(Product, pk=pk, userproduct__user=request.user)
            serializer = ProductSerializer(product)
            logger.debug('商品詳細を取得しました - 商品: %s', product.name)
            return Response(serializer.data)
        except Product.DoesNotExist:
            logger.warning('商品が見つかりません - 商品ID: %s, ユーザー: %s', pk, request.user.username)
            return Response({"detail": "商品が見つかりません"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error('商品詳細の取得中にエラーが発生しました - 商品ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # GET: user-products/{pk}/price-history/
    @action(detail=True, methods=['get'], url_path='price-history')
    def price_history(self, request, *args, **kwargs):
        """ユーザー商品の価格履歴を取得"""
        pk = kwargs['pk']
        logger.info('ユーザー商品の価格履歴の取得を開始 - ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            price_history = PriceHistory.objects.filter(
                product_on_ec_site__product__id=pk
            )
            serializer = PriceHistorySerializer(price_history, many=True)
            logger.debug('ユーザー商品の価格履歴を取得しました - 商品: %s', price_history[0].product_on_ec_site.product.name)
            return Response(serializer.data)
        except Exception as e:
            logger.error('ユーザー商品の価格履歴の取得中にエラーが発生しました - ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # POST: products/
    def create(self, request):
        pass
    
    # DELETE: products/{pk}/
    def destroy(self, request, *args, **kwargs):
        pass

# user-products/
class UserProductViewSet(viewsets.ViewSet):
    """
    ユーザーと商品の関連付けを管理するAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # GET: user-products/
    def list(self, request):
        """ログインユーザーの商品のみ表示"""
        logger.info('ユーザー商品一覧の取得を開始 - ユーザー: %s', request.user.username)
        try:
            queryset = UserProduct.objects.filter(user=request.user).select_related('product')
            serializer = UserProductSerializer(queryset, many=True)
            logger.debug('ユーザー商品一覧を取得しました - 件数: %d', len(serializer.data))
            return Response(serializer.data)
        except Exception as e:
            logger.error('ユーザー商品一覧の取得中にエラーが発生しました - ユーザー: %s, エラー: %s', 
                        request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # GET: user-products/{pk}/
    def retrieve(self, request, *args, **kwargs):
        """ログインユーザーの指定商品を取得"""
        pk = kwargs['pk']
        logger.info('ユーザー商品詳細の取得を開始 - ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            user_product = get_object_or_404(UserProduct, pk=pk, user=request.user)
            serializer = UserProductSerializer(user_product)
            logger.debug('ユーザー商品詳細を取得しました - 商品: %s', user_product.product.name)
            return Response(serializer.data)
        except UserProduct.DoesNotExist:
            logger.warning('ユーザー商品が見つかりません - ID: %s, ユーザー: %s', pk, request.user.username)
            return Response({"detail": "商品が見つかりません"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error('ユーザー商品詳細の取得中にエラーが発生しました - ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # POST: user-products/
    def create(self, request):
        """URLまたはJANコードから商品を登録"""
        logger.info('商品登録を開始 - ユーザー: %s', request.user.username)
        
        # クエリパラメータを取得
        url = request.data.get('url')
        jan_code = request.data.get('jan_code') # jan_code: str | None
        price_threshold = request.data.get('price_threshold')
        # パラメータバリデーション
        serializer = ProductRegistrationSerializer(data={'url': url, 'jan_code': jan_code, 'price_threshold': price_threshold})
        if not serializer.is_valid():
            logger.warning('クエリのバリデーションエラー - ユーザー: %s, エラー: %s', 
                         request.user.username, serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # サービス層に処理を委譲
            service = ProductService()
            products = service.search_products(
                user_id=request.user.id,
                url=url,
                jan_code=jan_code,
                price_threshold=price_threshold
            )
            
            # 検索結果をシリアライズして返却
            serializer = ProductSerializer(products, many=True)
            if len(serializer.data) == 0:
                return Response({"detail": "商品が見つかりませんでした"}, status=status.HTTP_404_NOT_FOUND)
            logger.info('商品登録が完了しました - 結果件数: %d, ユーザー: %s', 
                       len(products), request.user.username)
            return Response(serializer.data)
            
        except ValueError as e:
            logger.warning('商品検索の入力値エラー - ユーザー: %s, エラー: %s', 
                         request.user.username, str(e))
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ConnectionError as e:
            logger.error('外部サービス接続エラー - ユーザー: %s, エラー: %s', 
                        request.user.username, str(e))
            return Response({"detail": "外部サービスとの接続に失敗しました"}, 
                          status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error('商品検索中に予期せぬエラーが発生しました - ユーザー: %s, エラー: %s', 
                        request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # PUT: user-products/{pk}/
    def update(self, request, *args, **kwargs):
        """ユーザーと商品の関連付けを更新"""
        pk = kwargs['pk']
        logger.info('ユーザー商品の更新を開始 - ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            user_product = get_object_or_404(UserProduct, pk=pk, user=request.user)
            serializer = self._update_user_product(user_product, request.data, partial=False)
            logger.info('ユーザー商品を更新しました - 商品: %s..., ユーザー: %s', 
                       user_product.product.name[:20], request.user.username)
            return Response(serializer.data)
        except UserProduct.DoesNotExist:
            logger.warning('更新対象のユーザー商品が見つかりません - ID: %s, ユーザー: %s', 
                         pk, request.user.username)
            return Response({"detail": "商品が見つかりません"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error('ユーザー商品の更新中にエラーが発生しました - ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # PATCH: user-products/{pk}/
    def partial_update(self, request, *args, **kwargs):
        """ユーザーと商品の関連付けを更新"""
        pk = kwargs['pk']
        logger.info('ユーザー商品の部分更新を開始 - ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            user_product = get_object_or_404(UserProduct, pk=pk, user=request.user)
            serializer = self._update_user_product(user_product, request.data, partial=True)
            logger.info('ユーザー商品を部分更新しました - 商品: %s..., ユーザー: %s', 
                       user_product.product.name[:20], request.user.username)
            return Response(serializer.data)
        except UserProduct.DoesNotExist:
            logger.warning('部分更新対象のユーザー商品が見つかりません - ID: %s, ユーザー: %s', 
                         pk, request.user.username)
            return Response({"detail": "商品が見つかりません"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error('ユーザー商品の部分更新中にエラーが発生しました - ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # DELETE: user-products/{pk}/
    def destroy(self, request, *args, **kwargs):
        """商品を削除する前に、ユーザーとの関連付けを確認"""
        pk = kwargs['pk']
        logger.info('ユーザー商品の削除を開始 - ID: %s, ユーザー: %s', pk, request.user.username)
        try:
            # このユーザーに紐づく商品かを確認
            user_product = get_object_or_404(UserProduct, pk=pk, user=request.user)
            product_name = user_product.product.name
            
            # Product自体は削除しない。次回同一商品追加時に価格履歴が残るようにしておく。
            logger.info('ユーザーと商品の関連付けを削除します - 商品: %s..., ユーザー: %s', 
                        product_name[:20], request.user.username)
            user_product.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except UserProduct.DoesNotExist:
            logger.warning('削除対象のユーザー商品が見つかりません - ID: %s, ユーザー: %s', 
                         pk, request.user.username)
            return Response({"detail": "この商品は登録されていません。"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error('ユーザー商品の削除中にエラーが発生しました - ID: %s, ユーザー: %s, エラー: %s', 
                        pk, request.user.username, str(e), exc_info=True)
            return Response({"detail": "予期せぬエラーが発生しました"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _update_user_product(self, user_product, data, partial=False):
        try:
            serializer = UserProductSerializer(user_product, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return serializer
        except serializers.ValidationError as e:
            logger.warning('ユーザー商品の更新でバリデーションエラー - 商品: %s, ユーザー: %s, エラー: %s', 
                         user_product.product.name, user_product.user.username, str(e))
            raise
        except Exception as e:
            logger.error('ユーザー商品の更新で予期せぬエラー - 商品: %s, ユーザー: %s, エラー: %s', 
                        user_product.product.name, user_product.user.username, str(e), exc_info=True)
            raise
    
# Celery WorkerをRailwayから呼び出すためのAPI
# /fetch-and-store-prices/
class CeleryWorkerViewSet(APIView):
    """
    Celery WorkerをRailwayから呼び出すためのAPI
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """
        Celery Workerを呼び出す
        """
        fetch_and_store_prices.delay() # type: ignore
        check_price_alerts.delay() # type: ignore
        send_price_alert_notifications.delay() # type: ignore
        return Response({"detail": "Celery Workerを呼び出しました。"}, status=status.HTTP_200_OK)
    
# ここから下はAPI仕様書外の実装。使うにはフロント側でも対応が必要。
class ProductOnECSiteViewSet(viewsets.ModelViewSet):
    """
    ECサイト上の商品情報を管理するAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductOnECSiteSerializer
    
    def get_queryset(self):
        """ユーザーが登録した商品に関連するECサイト情報のみ返す"""
        # swagger_fake_viewの場合は空のクエリセットを返す
        if getattr(self, 'swagger_fake_view', False):
            return ProductOnECSite.objects.none()
            
        logger.debug('ECサイト商品情報の取得を開始 - ユーザー: %s', self.request.user.username) # type: ignore
        user_products = UserProduct.objects.filter(user=self.request.user).values_list('product_id', flat=True)
        return ProductOnECSite.objects.filter(product_id__in=user_products)
    
    # POST: product-on-ec/
    def perform_create(self, serializer):
        """商品がユーザーに紐づいているか確認してから保存"""
        product_id = serializer.validated_data.get('product').id
        logger.info('ECサイト商品情報の作成を開始 - 商品ID: %s, ユーザー: %s', 
                   product_id, self.request.user.username) # type: ignore
        try:
            # ユーザーが登録している商品か確認
            UserProduct.objects.get(user=self.request.user, product_id=product_id)
            serializer.save()
            logger.info('ECサイト商品情報を作成しました - 商品ID: %s, ユーザー: %s', 
                       product_id, self.request.user.username) # type: ignore
        except UserProduct.DoesNotExist:
            logger.warning('未登録の商品に対するECサイト情報作成の試み - 商品ID: %s, ユーザー: %s', 
                         product_id, self.request.user.username) # type: ignore
            raise serializers.ValidationError("この商品は登録されていません。")
    