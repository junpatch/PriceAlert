# products/serializers.py
from rest_framework import serializers
from .models import Product, ProductOnECSite, UserProduct, ECSite, PriceHistory

class ECSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ECSite
        fields = ['id', 'name', 'code', 'created_at', 'updated_at']

class ProductOnECSiteSerializer(serializers.ModelSerializer):
    ec_site = ECSiteSerializer(read_only=True)
    class Meta:
        model = ProductOnECSite
        fields = ['id', 'ec_site', 'current_price', 'effective_price', 'product_url', 'affiliate_url', 'seller_name', 'shipping_fee', 'condition', 'last_updated']

class ProductSerializer(serializers.ModelSerializer):
    ec_sites = ProductOnECSiteSerializer(source='productonecsite_set', many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'image_url', 'manufacturer', 'model_number', 'jan_code', 'ec_sites', 'created_at', 'updated_at']

class UserProductSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = UserProduct
        fields = ['id', 'user', 'product',  'price_threshold', 'threshold_type', 'threshold_percentage', 'notification_enabled', 'display_order', 'memo', 'created_at', 'updated_at']
        read_only_fields = ['user']

class PriceHistorySerializer(serializers.ModelSerializer):
    product_on_ec_site = ProductOnECSiteSerializer(read_only=True)
    
    class Meta:
        model = PriceHistory
        fields = ['id', 'points', 'effective_price', 'captured_at', 'created_at', 'product_on_ec_site', 'price']

class BaseProductSerializer(serializers.Serializer):
    """URLまたはJANコードのいずれかを使う共通シリアライザ"""
    url = serializers.URLField(required=False, allow_null=True)
    jan_code = serializers.RegexField(r'^\d{13}$', required=False, allow_null=True)

    def validate(self, data):
        if not data.get('url') and not data.get('jan_code'):
            raise serializers.ValidationError("URLまたはJANコードのいずれかを指定してください。")
        return data

class ProductSearchSerializer(BaseProductSerializer):
    """商品検索用（追加項目なし）"""
    pass

class ProductRegistrationSerializer(BaseProductSerializer):
    """商品登録用（価格しきい値あり）"""
    price_threshold = serializers.IntegerField(required=False, allow_null=True)