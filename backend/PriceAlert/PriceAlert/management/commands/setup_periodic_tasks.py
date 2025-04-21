from django.core.management.base import BaseCommand
from django.utils import timezone
from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule
import json

class Command(BaseCommand):
    help = 'django-celery-beatを使用して定期タスクをデータベースに設定します'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('定期タスク設定を開始します...'))
        
        # 既存のタスクをクリア（オプション）
        PeriodicTask.objects.filter(
            name__in=[
                'fetch_and_store_prices',
                'check_price_alerts',
                'send_price_alert_notifications'
            ]
        ).delete()
        
        # 4時間ごとの間隔スケジュールを作成または取得
        interval_4hours, _ = IntervalSchedule.objects.get_or_create(
            every=4,
            period=IntervalSchedule.HOURS
        )
        
        # 10分間隔のスケジュールを作成または取得（タスク連携用）
        interval_10min, _ = IntervalSchedule.objects.get_or_create(
            every=10,
            period=IntervalSchedule.MINUTES
        )
        
        # 固定時間のスケジュール（9時、13時、17時、21時）を作成
        crontab_9_13_17_21, _ = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour='9,13,17,21',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
        )
        
        # リトライポリシーの定義
        retry_policy = {
            'max_retries': 3,
            'interval_start': 30,
            'interval_step': 60,
            'interval_max': 300,
        }
        
        # 1. 価格取得タスク（4時間ごと、または9時、13時、17時、21時）
        # ここでは9時、13時、17時、21時を使用します
        fetch_task = PeriodicTask.objects.create(
            name='fetch_and_store_prices',
            task='products.tasks.fetch_and_store_prices',
            crontab=crontab_9_13_17_21,  # 4時間ごとの固定時間
            enabled=True,
            one_off=False,
            start_time=timezone.now(),
            expires=None,
            kwargs=json.dumps({}),
            # タスクオプション
            priority=10,
            headers=json.dumps({
                'expires': 3600,  # 1時間後に期限切れ
                'retry': True,
                'retry_policy': retry_policy
            }),
            description='商品の価格情報を取得して保存する（4時間ごと）',
        )
        
        # 2. 価格アラートチェックタスク（fetch_and_store_pricesの10分後）
        check_task = PeriodicTask.objects.create(
            name='check_price_alerts',
            task='notifications.tasks.check_price_alerts',
            crontab=CrontabSchedule.objects.get_or_create(
                minute='10',
                hour='9,13,17,21',
                day_of_week='*',
                day_of_month='*',
                month_of_year='*',
            )[0],
            enabled=True,
            one_off=False,
            start_time=timezone.now(),
            expires=None,
            kwargs=json.dumps({}),
            priority=5,
            headers=json.dumps({
                'expires': 3600,
                'retry': True,
                'retry_policy': retry_policy
            }),
            description='価格アラート条件をチェックして通知を作成する（fetch_and_store_pricesの後）',
        )
        
        # 3. 通知送信タスク（check_price_alertsの10分後）
        notify_task = PeriodicTask.objects.create(
            name='send_price_alert_notifications',
            task='notifications.tasks.send_price_alert_notifications',
            crontab=CrontabSchedule.objects.get_or_create(
                minute='20',
                hour='9,13,17,21',
                day_of_week='*',
                day_of_month='*',
                month_of_year='*',
            )[0],
            enabled=True,
            one_off=False,
            start_time=timezone.now(),
            expires=None,
            kwargs=json.dumps({}),
            priority=3,
            headers=json.dumps({
                'expires': 3600,
                'retry': True,
                'retry_policy': retry_policy
            }),
            description='価格アラート通知をメールで送信する（check_price_alertsの後）',
        )
        
        self.stdout.write(self.style.SUCCESS(f"タスク1: {fetch_task.name} - 作成完了"))
        self.stdout.write(self.style.SUCCESS(f"タスク2: {check_task.name} - 作成完了"))
        self.stdout.write(self.style.SUCCESS(f"タスク3: {notify_task.name} - 作成完了"))
        self.stdout.write(self.style.SUCCESS("定期タスク設定が完了しました。")) 