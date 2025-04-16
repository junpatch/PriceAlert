from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, LogoutView, UserProfileView, PasswordResetRequestView, PasswordResetConfirmView

app_name = 'accounts'

urlpatterns = [
    # ユーザー登録・認証
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    
    # ユーザープロフィール
    path('me/', UserProfileView.as_view(), name='profile'),
    
    # パスワードリセット
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/<str:token_url>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
] 
