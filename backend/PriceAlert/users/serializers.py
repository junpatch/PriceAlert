from rest_framework import serializers
from users.models import Settings
from accounts.serializers import UserSerializer
from notifications.models import EmailFrequency
from notifications.serializers import EmailFrequencySerializer

class SettingsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email_frequency = EmailFrequencySerializer(read_only=True)
    
    # def get_email_frequency(self, obj):
    #     return obj.email_frequency.email_frequency

    class Meta:
        model = Settings
        fields = ['id', 'email_frequency', 'email_notifications', 'user', 'created_at', 'updated_at']
    
    # def update(self, instance, validated_data):
    #     # リクエストからemail_frequencyフィールドを取得
    #     request_data = self.context['request'].data
        
    #     # email_frequencyが存在する場合の処理
    #     if 'email_frequency' in request_data:
    #         email_frequency_value = request_data.get('email_frequency')
            
    #         try:
    #             # email_frequency値に一致するオブジェクトを検索
    #             email_frequency_obj = EmailFrequency.objects.get(email_frequency=email_frequency_value)
    #             instance.email_frequency = email_frequency_obj
    #         except EmailFrequency.DoesNotExist:
    #             pass
        
    #     if 'email_notifications' in request_data:
    #         instance.email_notifications = request_data.get('email_notifications')
            
        
    #     instance.save()
    #     return instance
