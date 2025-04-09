from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework import serializers
from .models import Product, UserProduct, ProductOnECSite, ECSite
from .serializers import ProductSerializer, UserProductSerializer, ProductOnECSiteSerializer
from rest_framework import viewsets
from django.shortcuts import get_object_or_404
from .services import ProductService
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
# Create your views here.

class ProductViewSet(viewsets.ViewSet):
    """
    商品操作のAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # GET: products/
    def list(self, request):
        """商品一覧を返す GET: products/"""
        # TODO: ユーザーの商品のみ表示になっているので要修正
        queryset = Product.objects.filter(userproduct__user=request.user).distinct()
        serializer = ProductSerializer(queryset, many=True)
        return Response(serializer.data)
    
    # GET: products/{pk}/
    def retrieve(self, request, pk=None):
        """特定の商品の詳細を返す GET: products/{pk}/"""
        # TODO: ユーザーの商品のみ表示になっているので要修正
        product = get_object_or_404(Product, pk=pk, userproduct__user=request.user)
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    # POST: products/
    def create(self, request):
        pass
    
    # DELETE: products/{pk}/
    def destroy(self, request, *args, **kwargs):
        pass


class UserProductViewSet(viewsets.ViewSet):
    """
    ユーザーと商品の関連付けを管理するAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    
    # GET: user-products/
    def list(self, request):
        """ログインユーザーの商品のみ表示"""
        queryset = UserProduct.objects.filter(user=request.user).select_related('product')
        serializer = UserProductSerializer(queryset, many=True)
        return Response(serializer.data)
    
    # GET: user-products/{pk}/
    def retrieve(self, request, *args, **kwargs):
        """ログインユーザーの指定商品を取得"""
        user_product = get_object_or_404(UserProduct, pk=kwargs['pk'], user=request.user)
        serializer = UserProductSerializer(user_product)
        return Response(serializer.data)
    
    # POST: user-products/
    def create(self, request):
        """URLからログインユーザーの商品を登録"""
        url = request.data.get('url')
        price_threshold = request.data.get('price_threshold')
        if not url:
            return Response({"detail": "URLが指定されていません。"}, status=status.HTTP_400_BAD_REQUEST)

        # URLの形式チェック
        validator = URLValidator()
        try:
            validator(url)
        except ValidationError:
            return Response({"detail": "URLの形式が正しくありません。"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = ProductService()
            result = service.register_product_from_url(
                user_id=request.user.id,
                url=url,
                price_threshold=price_threshold
            )

            serializer = UserProductSerializer(result['user_product'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ConnectionError as e:
            return Response({"detail": "外部サービスとの接続に失敗しました"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({"detail": "予期せぬエラーが発生しました"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # PUT: user-products/{pk}/
    def update(self, request, *args, **kwargs):
        """ユーザーと商品の関連付けを更新"""
        user_product = get_object_or_404(UserProduct, pk=kwargs['pk'], user=request.user)
        serializer = self._update_user_product(user_product, request.data, partial=False)
        return Response(serializer.data)
    
    # PATCH: user-products/{pk}/
    def partial_update(self, request, *args, **kwargs):
        """ユーザーと商品の関連付けを更新"""
        user_product = get_object_or_404(UserProduct, pk=kwargs['pk'], user=request.user)
        serializer = self._update_user_product(user_product, request.data, partial=True)
        return Response(serializer.data)

    # DELETE: user-products/{pk}/
    def destroy(self, request, *args, **kwargs):
        """商品を削除する前に、ユーザーとの関連付けを確認"""
        # このユーザーに紐づく商品かを確認
        user_product = get_object_or_404(UserProduct, pk=kwargs['pk'], user=request.user)
        serializer = UserProductSerializer(user_product)
        try:
            # 他のユーザーも使っている場合は関連付けのみ削除
            if user_product.product.userproduct.count() <= 1:
                user_product.product.delete()
            else:
                user_product.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except UserProduct.DoesNotExist:
            return Response({"detail": "この商品は登録されていません。"}, status=status.HTTP_404_NOT_FOUND)
    
    
    def _update_user_product(self, user_product, data, partial=False):
        serializer = UserProductSerializer(user_product, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return serializer
    
# ここから下はAPI仕様書外の実装。使うにはフロント側でも対応が必要。
class ProductOnECSiteViewSet(viewsets.ModelViewSet):
    """
    ECサイト上の商品情報を管理するAPI
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductOnECSiteSerializer
    
    def get_queryset(self):
        """ユーザーが登録した商品に関連するECサイト情報のみ返す"""
        user_products = UserProduct.objects.filter(user=self.request.user).values_list('product_id', flat=True)
        return ProductOnECSite.objects.filter(product_id__in=user_products)
    
    # POST: product-on-ec/
    def perform_create(self, serializer):
        """商品がユーザーに紐づいているか確認してから保存"""
        product_id = serializer.validated_data.get('product').id
        try:
            # ユーザーが登録している商品か確認
            UserProduct.objects.get(user=self.request.user, product_id=product_id)
            serializer.save()
        except UserProduct.DoesNotExist:
            raise serializers.ValidationError("この商品は登録されていません。")
        