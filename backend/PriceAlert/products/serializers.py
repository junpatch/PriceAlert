# products/serializers.py
from rest_framework import serializers
from .models import Product, ProductOnECSite, UserProduct, ECSite

class ECSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ECSite
        fields = ['id', 'name', 'code', 'created_at', 'updated_at']

class ProductOnECSiteSerializer(serializers.ModelSerializer):
    ec_site = ECSiteSerializer(read_only=True)
    class Meta:
        model = ProductOnECSite
        fields = ['id', 'ec_site', 'current_price', 'effective_price', 'product_url', 'affiliate_url', 'last_updated']

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

class ProductRegistrationSerializer(serializers.Serializer):
    """商品登録用のシリアライザ"""
    url = serializers.URLField(required=False)
    jan_code = serializers.RegexField(r'^\d{13}$', required=False)
    price_threshold = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)

    def validate(self, data):
        """URLまたはJANコードのいずれかが必要"""
        if not data.get('url') and not data.get('jan_code'):
            raise serializers.ValidationError("URLまたはJANコードのいずれかを指定してください。")
        return data