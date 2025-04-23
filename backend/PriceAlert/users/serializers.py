from rest_framework import serializers
from users.models import Settings
from accounts.serializers import UserSerializer
from notifications.serializers import EmailFrequencySerializer

class SettingsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email_frequency = EmailFrequencySerializer(read_only=True)

    class Meta:
        model = Settings
        fields = ['id', 'email_frequency', 'email_notifications', 'user', 'created_at', 'updated_at']
 