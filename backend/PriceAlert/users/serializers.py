from rest_framework import serializers
from users.models import Settings
from accounts.serializers import UserSerializer

class SettingsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Settings
        fields = ['id', 'notification_frequency', 'email_notifications', 'user', 'created_at', 'updated_at']
        