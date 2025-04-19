from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import uuid

from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .models import User, PasswordResetToken
from users.models import Settings


class RegisterView(APIView):
    """
    ユーザー登録API
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_serializer = RegisterSerializer(data=request.data)
        if user_serializer.is_valid():
            # ユーザーを作成
            user = user_serializer.save()
            
            # JWTトークンを生成
            refresh = RefreshToken.for_user(user) # type: ignore
            
            response_data = {
                'refresh_token': str(refresh),
                'access_token': str(refresh.access_token), # type: ignore
                'user': UserSerializer(user).data
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    ログインAPI
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email') # type: ignore
            password = serializer.validated_data.get('password') # type: ignore
            
            # ユーザー認証
            user = authenticate(request, email=email, password=password)
            
            if user is not None:
                login(request, user)  # セッションベースのログインも実施
                
                # JWTトークン発行
                refresh = RefreshToken.for_user(user)
                
                response_data = {
                    'refresh_token': str(refresh),
                    'access_token': str(refresh.access_token), # type: ignore
                    'user': UserSerializer(user).data
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'メールアドレスまたはパスワードが正しくありません'}, 
                               status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    ログアウトAPI
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # クライアントから送信されたリフレッシュトークンを無効化
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # セッションベースの認証をログアウト
            logout(request)
            
            return Response({'success': 'ログアウトに成功しました'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'ログアウト処理でエラーが発生しました: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    ユーザープロフィールAPI
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """現在のユーザー情報を取得"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """ユーザー情報を更新"""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    パスワードリセットリクエストAPI
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email') # type: ignore

            response_message = {
                'detail': 'パスワードリセットのリンクをメールで送信しました。'
            }

            # ユーザーを検索
            try:
                user = User.objects.get(email=email)

                # 既存の未使用トークンを無効化
                PasswordResetToken.objects.filter(
                    user=user, 
                    is_used=False,
                    expires_at__gt=timezone.now()
                    ).update(is_used=True)

                # 新しいトークンを作成
                token = PasswordResetToken.objects.create(
                    user=user,
                    token=str(uuid.uuid4()),
                    expires_at=timezone.now() + timezone.timedelta(hours=1)
                )

                # メール送信
                self.send_reset_email(user, token)

            except User.DoesNotExist:
                pass

            return Response(response_message, status=status.HTTP_200_OK)


        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_reset_email(self, user, token):
        """パスワードリセットのメールを送信"""
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token.token}"
        subject = "【PriceAlert】パスワードリセットのご案内"
        context = {
            'user': user,
            'reset_url': reset_url,
            'valid_hours': 1,
        }

        html_message = render_to_string('emails/password_reset_email.html', context)
        text_message = strip_tags(html_message)
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [user.email]
        
        send_mail(
            subject, 
            text_message, 
            from_email, 
            to_email, 
            html_message=html_message
        )


class PasswordResetConfirmView(APIView):
    """
    パスワードリセット確認API
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, token_url=None):
        # URLからトークンを取得する場合
        if token_url:
            request.data['token'] = token_url
            
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token_str = serializer.validated_data.get('token') # type: ignore
            password = serializer.validated_data.get('password') # type: ignore
            
            try:
                # トークン検証
                token = PasswordResetToken.objects.get(token=token_str, is_used=False)
                
                if not token.is_valid():
                    return Response(
                        {'error': 'トークンが無効または期限切れです。'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # パスワード更新
                user = token.user
                user.set_password(password)
                user.save()
                
                # トークンを使用済みに設定
                token.is_used = True
                token.save()
                
                # パスワード変更確認メールの送信
                self.send_password_change_notification(user)
                
                return Response(
                    {'detail': 'パスワードが正常にリセットされました。'},
                    status=status.HTTP_200_OK
                )
                
            except PasswordResetToken.DoesNotExist:
                return Response(
                    {'error': 'トークンが無効です。'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def send_password_change_notification(self, user):
        """パスワード変更通知メールを送信"""
        subject = "【PriceAlert】パスワードが変更されました"
        message = f"""
        {user.username} 様
        
        あなたのPriceAlertアカウントのパスワードが正常に変更されました。
        
        このパスワード変更に心当たりがない場合は、直ちに管理者にご連絡ください。
        
        ※このメールは自動送信されています。返信しないでください。
        
        -----------------------------------------------
        PriceAlertチーム
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
