from rest_framework import serializers
from users.models import Settings
from accounts.serializers import UserSerializer
from notifications.serializers import EmailFrequencySerializer
from notifications.models import EmailFrequency

class SettingsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email_frequency = EmailFrequencySerializer(read_only=True)
    email_frequency_id = serializers.PrimaryKeyRelatedField(
        source='email_frequency',
        queryset=EmailFrequency.objects.all(),
        write_only=True
    )

    class Meta:
        model = Settings
        fields = ['id', 'email_frequency','email_frequency_id', 'email_notifications', 'user', 'created_at', 'updated_at']
 