from django.db import models
from accounts.models import User
from notifications.models import EmailFrequency

def get_default_email_frequency():
    return EmailFrequency.objects.get_or_create(id=1)[0]

class Settings(models.Model):
    email_frequency = models.ForeignKey(
        EmailFrequency, 
        on_delete=models.RESTRICT, 
        default=get_default_email_frequency
    )
    email_notifications = models.BooleanField(default=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = []

    def __str__(self):
        return f"{self.user.username} - {self.email_frequency.email_frequency} - {self.email_notifications}"