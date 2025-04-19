from django.db import models
from accounts.models import User


class Settings(models.Model):
    notification_frequency = models.CharField(max_length=50, default="immediately") # immediately, daily, weekly
    email_notifications = models.BooleanField(default=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = []

    def __str__(self):
        return f"{self.user.username} - {self.notification_frequency} - {self.email_notifications}"