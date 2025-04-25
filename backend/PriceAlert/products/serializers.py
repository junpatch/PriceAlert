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
        fields = ['id', 'ec_site', 'current_price', 'effective_price', 'product_url', 'affiliate_url', 'seller_name', 'shipping_fee', 'condition', 'last_updated', 'is_active', 'created_at', 'updated_at']

    def validate(self, data):
        ec_product_id = data.get('ec_product_id')
        ec_site = data.get('ec_site')

        if ProductOnECSite.objects.filter(ec_product_id=ec_product_id, ec_site=ec_site).exists():
            raise serializers.ValidationError('このECサイト上のec_product_idはすでに存在します。')

        return data

class ProductSerializer(serializers.ModelSerializer):
    ec_sites = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'image_url', 'manufacturer', 'model_number', 'jan_code', 'ec_sites', 'created_at', 'updated_at']

    def get_ec_sites(self, obj):
        ec_sites = []
        for poe in obj.productonecsite_set.all():
            ec_site_data = {
                'id': poe.id,
                'current_price': poe.current_price,
                'effective_price': poe.effective_price,
                'product_url': poe.product_url,
                'affiliate_url': poe.affiliate_url,
                'seller_name': poe.seller_name,
                'shipping_fee': poe.shipping_fee,
                'condition': poe.condition,
                'last_updated': poe.last_updated,
                'is_active': poe.is_active,
                'created_at': poe.created_at,
                'updated_at': poe.updated_at,
                'ec_site': {
                    'id': poe.ec_site.id,
                    'name': poe.ec_site.name,
                    'code': poe.ec_site.code,
                }
            }
            ec_sites.append(ec_site_data)
        return ec_sites

class UserProductSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProduct
        fields = ['id', 'user', 'product',  'price_threshold', 'threshold_type', 'threshold_percentage', 'notification_enabled', 'display_order', 'memo', 'created_at', 'updated_at']
        read_only_fields = ['user']

    def get_product(self, obj):
        return {
            'id': obj.product.id,
            'name': obj.product.name,
        }

class PriceHistorySerializer(serializers.ModelSerializer):
    # 必要最小限のフィールドのみを含むシリアライザーを使用
    product_on_ec_site = serializers.SerializerMethodField()
    
    class Meta:
        model = PriceHistory
        fields = ['id', 'points', 'effective_price', 'captured_at', 'created_at', 'product_on_ec_site', 'price']
    
    def get_product_on_ec_site(self, obj):
        # 必要な情報のみを返すことでクエリを削減
        product_on_ec = obj.product_on_ec_site
        return {
            'id': product_on_ec.id,
            'current_price': product_on_ec.current_price,
            'effective_price': product_on_ec.effective_price,
            'seller_name': product_on_ec.seller_name,
            'ec_site': {
                'id': product_on_ec.ec_site.id,
                'name': product_on_ec.ec_site.name,
            },
            'product': {
                'id': product_on_ec.product.id,
                'name': product_on_ec.product.name,
            },
            'updated_at': product_on_ec.updated_at,
        }

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