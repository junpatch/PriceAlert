from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Alert, Notification
from .serializers import AlertSerializer, NotificationSerializer
from products.models import Product, UserProduct


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    オブジェクト所有者のみ編集可能な権限クラス
    """
    def has_object_permission(self, request, view, obj):
        # 読み取りリクエストは常に許可
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # オブジェクトの所有者かどうかを確認
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'user_product'):
            return obj.user_product.user == request.user
        return False


class AlertViewSet(viewsets.ModelViewSet):
    """
    アラート設定のViewSet
    """
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """
        ログインユーザーのアラート設定のみを取得
        """
        user = self.request.user
        product_id = self.request.query_params.get('product_id') # type: ignore
        
        queryset = Alert.objects.filter(
            user_product__user=user
        )
        
        if product_id:
            queryset = queryset.filter(user_product__product_id=product_id)
            
        return queryset
    
    def perform_create(self, serializer):
        """
        アラート作成時に必要な追加処理
        """
        # ユーザー商品が正しく所有されているか確認
        user_product_id = self.request.data.get('user_product') # type: ignore
        user_product = UserProduct.objects.get(id=user_product_id)
        
        if user_product.user != self.request.user:
            return Response(
                {"detail": "指定されたユーザー商品の所有権限がありません。"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    通知のViewSet
    読み取り専用（通知の作成は内部で行われる）
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        ログインユーザーの通知のみを取得
        """
        user = self.request.user
        is_read = self.request.query_params.get('is_read') # type: ignore
        
        queryset = Notification.objects.filter(user=user)
        
        # 既読・未読フィルター
        if is_read:
            is_read_bool = str(is_read).lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
            
        return queryset
    
    @action(detail=False, methods=['post'], url_path='mark-read')
    def mark_read(self, request):
        """
        通知を既読にするアクション
        単一または複数の通知IDを受け取り、それらを既読にする
        """
        notification_ids = request.data.get('notification_ids', [])
        is_all_read = str(request.data.get('all', "false")).lower() == 'true'
        
        filter = {
            'user': request.user,
            'is_read': False
        }

        if not is_all_read:            
            if not notification_ids:
                return Response(
                    {"detail": "notification_idsが必要です。"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif not isinstance(notification_ids, list) and not isinstance(notification_ids, int):
                return Response(
                    {"detail": "notification_idsはリストまたは整数である必要があります。"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if isinstance(notification_ids, int):
                notification_ids = [notification_ids]

            filter['id__in'] = notification_ids

        # ユーザーに紐づく通知のみ更新
        updated_count = Notification.objects.filter(**filter).update(is_read=True)
        
        return Response({
            "status": "success",
            "updated_count": updated_count
        })
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """
        すべての通知を既読にするアクション
        """
        # ユーザーに紐づく未読の通知のみ更新
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            "status": "success",
            "updated_count": updated_count
        })
