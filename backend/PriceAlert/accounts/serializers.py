from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    ユーザー情報のシリアライザー
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'last_login']


class RegisterSerializer(serializers.ModelSerializer):
    """
    ユーザー登録用シリアライザー
    """
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all(), message="このメールアドレスは既に使用されています")]
    )
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    confirmPassword = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'confirmPassword']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({"password": "パスワードが一致しません"})
        return attrs

    def create(self, validated_data):
        # confirmPasswordは不要なので削除
        validated_data.pop('confirmPassword')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        
        return user


class LoginSerializer(serializers.Serializer):
    """
    ログイン用シリアライザー
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True) 


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    パスワードリセットリクエスト用シリアライザー
    """
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    パスワードリセット確認用シリアライザー
    """
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    confirmPassword = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({"password": "パスワードが一致しません"})
        return attrs
