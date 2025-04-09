from django.db import models
from decimal import Decimal
from django.conf import settings
# Create your models here.
class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    manufacturer = models.CharField(max_length=100, null=True, blank=True)
    model_number = models.CharField(max_length=100, null=True, blank=True)
    jan_code = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['jan_code']),
            models.Index(fields=['model_number']),
        ]

    def __str__(self):
        return self.name

class ECSite(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    api_base_url = models.URLField(null=True, blank=True)
    affiliate_format = models.CharField(max_length=512, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return self.name


class ProductOnECSite(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    ec_site = models.ForeignKey(ECSite, on_delete=models.RESTRICT)
    ec_product_id = models.CharField(max_length=100)
    product_url = models.URLField()
    affiliate_url = models.URLField(null=True, blank=True)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_points = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=Decimal('0'))
    effective_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['product', 'ec_site']),
            models.Index(fields=['ec_product_id']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.ec_site.name}"

class PriceHistory(models.Model):
    product_on_ec_site = models.ForeignKey(ProductOnECSite, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    points = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    effective_price = models.DecimalField(max_digits=10, decimal_places=2)
    captured_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['product_on_ec_site']),
            models.Index(fields=['captured_at']),
        ]
        ordering = ['-captured_at']

    def __str__(self):
        return f"{self.product_on_ec_site} - {self.price}円 ({self.captured_at})"

class UserProduct(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='userproduct')
    price_threshold = models.DecimalField(max_digits=10, decimal_places=2,null=True, blank=True)
    threshold_type = models.CharField(max_length=20, default='list_price')
    threshold_percentage = models.DecimalField(max_digits=10, decimal_places=2,null=True, blank=True)
    notification_enabled = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    memo = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['threshold_type']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"

