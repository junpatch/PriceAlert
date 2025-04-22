from rest_framework import viewsets
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework import status
from .models import Settings
from .serializers import SettingsSerializer
from rest_framework.decorators import action
from accounts.serializers import UserSerializer


class UserViewSet(viewsets.ViewSet):
    """
    ユーザー情報の取得と更新
    """
    permission_classes = [permissions.IsAuthenticated]

    # GET: users/me/
    # PATCH: users/me/
    @action(detail=False, methods=['GET', 'PATCH'])
    def me(self, request):
        """
        ユーザー情報の取得と更新
        """
        if request.method == 'GET':
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = UserSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SettingsView(viewsets.ViewSet):
    """
    設定操作のAPI
    """
    permission_classes = [permissions.IsAuthenticated]

    # GET: users/settings/me/
    # PATCH: users/settings/me/
    @action(detail=False, methods=['GET', 'PATCH'])
    def me(self, request):
        """
        ユーザー情報の取得と更新
        """
        settings = Settings.objects.get(user=request.user)
        if request.method == 'GET':
            serializer = SettingsSerializer(settings)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = SettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
