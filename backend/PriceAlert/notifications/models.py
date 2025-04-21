from django.db import models
from django.conf import settings
from products.models import Product, ProductOnECSite, UserProduct

class Alert(models.Model):
    """
    アラート設定モデル
    ユーザーが設定した価格アラート条件を保存する
    """
    ALERT_TYPES = [
        ('price_drop', '価格下落'),
        ('percentage_drop', '割合変動'),
        ('price_threshold', '閾値通知'),
    ]
    
    user_product = models.ForeignKey(UserProduct, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    threshold_value = models.IntegerField(null=True, blank=True)
    threshold_percentage = models.IntegerField(null=True, blank=True)
    threshold_type = models.CharField(max_length=20, default='list_price')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['alert_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.user_product} - {self.alert_type}"


class Notification(models.Model):
    """
    通知モデル
    送信された通知の記録を保存する
    """
    NOTIFICATION_TYPES = [
        ('price_drop', '価格下落通知'),
        ('percentage_drop', '割合変動通知'),
        ('price_threshold', '閾値通知'),
        ('weekly_report', '週次レポート'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_on_ec_site = models.ForeignKey(ProductOnECSite, on_delete=models.CASCADE)
    alert = models.ForeignKey(Alert, on_delete=models.SET_NULL, null=True, blank=True)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    old_price = models.IntegerField(null=True, blank=True)
    new_price = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
            models.Index(fields=['sent_at']),
        ]
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name} - {self.notification_type}"

# メール送信履歴モデル
class EmailFrequency(models.Model):
    """
    メール送信履歴モデル
    メール送信履歴を保存する
    """
    FREQUENCY_CHOICES = [
        ('immediately', '即時'),
        ('daily', '毎日'),
        ('weekly', '毎週'),
    ]

    email_frequency = models.CharField(max_length=50, choices=FREQUENCY_CHOICES)
    interval = models.IntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email_frequency} - {self.sent_at}"

