from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import User
from users.models import Settings


@receiver(post_save, sender=User)
def create_user_settings(sender, instance, created, **kwargs):
    """
    ユーザー作成時に設定を自動的に作成するシグナルハンドラ
    """
    if created:
        Settings.objects.create(user=instance) 