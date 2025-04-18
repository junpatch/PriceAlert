# PriceAlert/celery.py
import os
from celery import Celery

# Django設定を Celeryに読み込ませる
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PriceAlert.settings')

app = Celery('PriceAlert')

# Djangoのsettings.pyからCELERY関連設定を読み込む
app.config_from_object('django.conf:settings', namespace='CELERY')

# タスクを自動的に発見してインポート
app.autodiscover_tasks()

# ログ出力を見やすくするオプション（任意）
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
