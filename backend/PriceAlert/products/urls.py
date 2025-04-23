from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, UserProductViewSet, ProductOnECSiteViewSet, CeleryWorkerViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'user-products', UserProductViewSet, basename='user-product')
router.register(r'product-on-ec', ProductOnECSiteViewSet, basename='product-on-ec')

urlpatterns = [
    path('', include(router.urls)),
    path('fetch-and-store-prices/', CeleryWorkerViewSet.as_view(), name='fetch-and-store-prices'),
]

