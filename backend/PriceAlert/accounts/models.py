from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from typing import Any, Optional, Type, TypeVar, cast
from django.db import transaction
import logging

# ロガーの設定
logger = logging.getLogger(__name__)

T = TypeVar('T', bound='User')

class UserManager(BaseUserManager):
    def create_user(self, email: str, username: str, password: Optional[str] = None, **extra_fields: Any) -> 'User':
        """
        通常ユーザーを作成する
        トランザクション内でユーザーと設定を同時に作成し、一貫性を確保する
        """
        if not email:
            raise ValueError('メールアドレスは必須です')
        
        email = self.normalize_email(email)
        
        # トランザクション内でユーザーと設定を作成
        with transaction.atomic():
            user = self.model(email=email, username=username, **extra_fields)
            user.set_password(password)
            user.save(using=self._db)
            # 注意: 循環インポートを避けるため、ここで直接インポート
            from users.models import Settings
            try:
                settings = Settings.objects.create(user=user)
                logger.info(f"ユーザー {username} の設定が正常に作成されました")
            except Exception as e:
                logger.error(f"ユーザー {username} の設定作成に失敗しました: {str(e)}")
                # 例外を再スローするとトランザクションがロールバックされる
                raise
                
        return cast('User', user)
    
    def create_superuser(self, email: str, username: str, password: Optional[str] = None, **extra_fields: Any) -> 'User':
        """
        スーパーユーザーを作成する
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('スーパーユーザーはis_staff=Trueである必要があります')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('スーパーユーザーはis_superuser=Trueである必要があります')
        
        return self.create_user(email, username, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(blank=True, null=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    objects = UserManager()
    
    def __str__(self):
        return self.email


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_valid(self) -> bool:
        """トークンが有効かどうかを検証"""
        return not self.is_used and self.expires_at > timezone.now()
        

    def __str__(self):
        return f"{self.user.email} - {self.token[:10]}..."
