from django.contrib import admin
from .models import Alert, Notification

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_product', 'alert_type', 'threshold_value', 'is_active', 'created_at')
    list_filter = ('alert_type', 'is_active', 'created_at')
    search_fields = ('user_product__user__email', 'user_product__product__name')
    date_hierarchy = 'created_at'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'notification_type', 'is_read', 'sent_at')
    list_filter = ('notification_type', 'is_read', 'sent_at')
    search_fields = ('user__email', 'product__name', 'message')
    date_hierarchy = 'sent_at'
    readonly_fields = ('user', 'product', 'product_on_ec_site', 'alert', 'notification_type', 
                       'message', 'old_price', 'new_price', 'sent_at', 'created_at')
