from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, RegisterSerializer, LoginSerializer


class RegisterView(APIView):
    """
    ユーザー登録API
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    ログインAPI
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            password = serializer.validated_data.get('password')
            
            # ユーザー認証
            user = authenticate(request, email=email, password=password)
            
            if user is not None:
                login(request, user)  # セッションベースのログインも実施
                
                # JWTトークン発行
                refresh = RefreshToken.for_user(user)
                
                response_data = {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
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
