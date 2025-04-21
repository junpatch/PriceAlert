# PriceAlert/celery.py
import os
import ssl
from celery import Celery
from celery.schedules import crontab

# Django設定を Celeryに読み込ませる
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PriceAlert.settings')

app = Celery('PriceAlert')

# Djangoのsettings.pyからCELERY関連設定を読み込む
app.config_from_object('django.conf:settings', namespace='CELERY')

# タスクを自動的に発見してインポート
app.autodiscover_tasks()

# リトライの設定
app.conf.task_acks_late = True  # タスクが正常に完了した場合のみ確認を行う
app.conf.task_reject_on_worker_lost = True  # ワーカーが予期せず失敗した場合にタスクをリトライ
app.conf.task_default_retry_delay = 30  # リトライ間隔（秒）
app.conf.task_max_retries = 3  # 最大リトライ回数

# ログ出力を見やすくするオプション（任意）
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
