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

