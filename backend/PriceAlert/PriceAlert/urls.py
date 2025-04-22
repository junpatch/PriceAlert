"""
URL configuration for PriceAlert project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

# 環境に応じたベースURLを設定
if settings.IS_PRODUCTION:
    # 本番環境では完全なURLを指定（HTTPSスキーム）
    # swagger_url = 'https://pricealert-tpqq.onrender.com'
    schemes = ['https']
else:
    # 開発環境ではNoneに設定（相対パスを使用）
    # swagger_url = None
    schemes = ['http', 'https']

info = openapi.Info(
    title='Forum API',
    default_version='v1',
    description='掲示板アプリ向けAPI',
    contact=openapi.Contact(email='daeu@test.com'),
    license=openapi.License(name="Apache 2.0", url="http://www.apache.org/licenses/LICENSE-2.0.html"),
)

schema_view = get_schema_view(
    info,
    public=True,
    permission_classes=(permissions.AllowAny,),
    # url=swagger_url,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    
    # API V1エンドポイント
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/', include('products.urls')),
    path('api/v1/', include('notifications.urls')),
]
