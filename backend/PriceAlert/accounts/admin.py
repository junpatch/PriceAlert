from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

User = get_user_model()

class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ['email', 'username', 'is_active', 'is_staff', 'last_login', 'created_at']
    list_filter = ['is_active', 'is_staff', 'created_at']
    search_fields = ['email', 'username']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('個人情報', {'fields': ('username',)}),
        ('権限', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('重要な日付', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ['last_login', 'created_at', 'updated_at']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )

admin.site.register(User, UserAdmin)
