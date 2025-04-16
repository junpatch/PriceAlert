from rest_framework.routers import DefaultRouter
from .views import UserViewSet, SettingsView
from django.urls import path, include

router = DefaultRouter()
router.register(r'', UserViewSet, basename='me')
router.register(r'settings', SettingsView, basename='settings')


urlpatterns = [
    # 設定
    path('', include(router.urls)),
]
