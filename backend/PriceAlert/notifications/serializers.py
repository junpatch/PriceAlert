from rest_framework import serializers
from .models import Alert, Notification
from products.models import Product


class ProductBasicSerializer(serializers.ModelSerializer):
    """
    通知での表示用のシンプルな商品シリアライザー
    """
    class Meta:
        model = Product
        fields = ['id', 'name', 'image_url']


class ECSiteBasicSerializer(serializers.Serializer):
    """
    通知での表示用のシンプルなECサイトシリアライザー
    """
    id = serializers.IntegerField()
    name = serializers.CharField()


class AlertSerializer(serializers.ModelSerializer):
    """
    アラート設定のシリアライザー
    """
    class Meta:
        model = Alert
        fields = [
            'id', 'user_product', 'alert_type', 'threshold_value', 
            'threshold_percentage', 'threshold_type', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """
    通知のシリアライザー
    """
    product = ProductBasicSerializer(read_only=True)
    ec_site = serializers.SerializerMethodField()
    affiliate_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'product', 'ec_site', 'notification_type', 'message',
            'old_price', 'new_price', 'affiliate_url', 'is_read', 'sent_at'
        ]
        read_only_fields = ['id', 'product', 'ec_site', 'notification_type', 'message',
                           'old_price', 'new_price', 'affiliate_url', 'sent_at']
    
    def get_ec_site(self, obj):
        """
        ECサイト情報を取得
        """
        return {
            'id': obj.product_on_ec_site.ec_site.id,
            'name': obj.product_on_ec_site.ec_site.name
        }
    
    def get_affiliate_url(self, obj):
        """
        アフィリエイトURLを取得
        """
        return obj.product_on_ec_site.affiliate_url 