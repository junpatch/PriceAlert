from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, NotificationViewSet

# DRF RouterをセットアップしてViewSetをルーティング
router = DefaultRouter()
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
] 