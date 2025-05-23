"""
Django settings for PriceAlert project.

Generated by 'django-admin startproject' using Django 5.0.4.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv


load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', "django-insecure-d-sbx2!!5ovck860b%e@!_ijh4_-o+eti*1%9)!zu0l8(au()i")

# SECURITY WARNING: don't run with debug turned on in production!
# 環境変数DJANGO_ENVIRONMENTに基づいて環境を判定
ENVIRONMENT = os.getenv('DJANGO_ENVIRONMENT', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'

# 環境に応じたデバッグ設定
DEBUG = True

# SQL実行のログを記録する（一時的な設定）
DEBUG_QUERY_LOG = True

# フロントエンドURL（環境に応じて変更）
if IS_PRODUCTION:
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://price-alert-delta.vercel.app')
    BACKEND_URL = os.getenv('BACKEND_URL', 'https://pricealert-tpqq.onrender.com')
else:
    FRONTEND_URL = 'http://localhost:5173'  # 開発環境のフロントエンドURL
    BACKEND_URL = 'http://localhost:8000'  # 開発環境のバックエンドURL

# 本番環境の場合はセキュリティ設定を有効化
if IS_PRODUCTION:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1年
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# 常に開発用ホストを含める
DEV_HOSTS = ['127.0.0.1', 'localhost']

# 環境変数から取得するか、デフォルト値を使用
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 
                        f'{FRONTEND_URL},{BACKEND_URL}').replace('http://', '').replace('https://', '').split(',')

# 開発用ホストを追加
ALLOWED_HOSTS.extend(DEV_HOSTS)


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_beat",
    # サードパーティアプリ
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    'drf_yasg',
    # "querycount",
    
    # 自作アプリ
    "PriceAlert",  # プロジェクト自体をアプリとして追加
    "accounts",
    "users",
    "products",
    "notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # CORSミドルウェア
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # "querycount.middleware.QueryCountMiddleware",
]

ROOT_URLCONF = "PriceAlert.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / 'templates'],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "PriceAlert.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

# 環境変数があればPostgreSQLを使用
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = "ja"

TIME_ZONE = "Asia/Tokyo"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# WhiteNoiseを追加（静的ファイル配信用）
if IS_PRODUCTION:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# カスタムユーザーモデルの設定
AUTH_USER_MODEL = 'accounts.User'

# REST Framework設定
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # デバッグ用に便利
    ]
}

# JWT設定
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CSRF設定
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 本番環境の場合は追加の設定
if IS_PRODUCTION:
    CSRF_TRUSTED_ORIGINS.extend([
        FRONTEND_URL,
        BACKEND_URL,
    ])

# CORS設定
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Viteの開発サーバー
    "http://127.0.0.1:5173",
]

# 本番環境の場合は追加の設定
if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS.extend([
        FRONTEND_URL,
        BACKEND_URL,
    ])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
] 

# Celery設定
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# メール設定（開発環境ではコンソール出力）
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@pricealert.example.com'


# メール設定（本番環境）
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Amazon APIキー
AMAZON_API_KEY = os.getenv('AMAZON_API_KEY')
AMAZON_API_SECRET = os.getenv('AMAZON_API_SECRET')
AMAZON_ASSOCIATE_TAG = os.getenv('AMAZON_ASSOCIATE_TAG')

# 楽天 APIキー
RAKUTEN_API_KEY = os.getenv('RAKUTEN_API_KEY')
RAKUTEN_API_SECRET = os.getenv('RAKUTEN_API_SECRET')
RAKUTEN_AFFILIATE_ID = os.getenv('RAKUTEN_AFFILIATE_ID')

# Yahoo APIキー
YAHOO_CLIENT_ID = os.getenv('YAHOO_CLIENT_ID')
YAHOO_AFFILIATE_ID = os.getenv('YAHOO_AFFILIATE_ID')

# ログ設定
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)  # フォルダがなければ作る

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] [{levelname}] [{name}] [{module}:{lineno}] {message}',
            'style': '{',
        },
        'colored': {
            '()': 'PriceAlert.log_format.CustomColoredFormatter',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'colored',
        },
        'logfile': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': str(LOG_DIR / 'logfile.log'),
            'when': 'midnight',
            'backupCount': 30,
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'logfile'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'logfile', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'products': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'users': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'notifications': {
            'handlers': ['console', 'logfile'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'logfile', 'mail_admins'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Configure Django Debug Toolbar
if DEBUG:
    INSTALLED_APPS += [
        'debug_toolbar',
    ]
    MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
    INTERNAL_IPS = ['127.0.0.1', 'localhost']

# SQLクエリの出力設定
if DEBUG and DEBUG_QUERY_LOG:
    LOGGING['loggers']['django.db.backends']['level'] = 'DEBUG'
    LOGGING['loggers']['django.db.backends']['handlers'] = ['console']

