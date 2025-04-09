from django.contrib import admin
from .models import Product, ECSite, ProductOnECSite, PriceHistory
# Register your models here.
admin.site.register(Product)
admin.site.register(ECSite)
admin.site.register(ProductOnECSite)
admin.site.register(PriceHistory)

