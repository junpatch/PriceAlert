from celery import shared_task
import logging
from .services import NotificationService, EmailNotificationService
import time

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True
)
def check_price_alerts(self):
    """
    価格アラートをチェックする定期タスク
    商品の価格が設定条件を満たした場合に通知を生成する
    fetch_and_store_pricesの後に実行される
    """
    try:
        logger.info("価格アラートチェックタスクを開始します")
        start_time = time.time()

        # 価格アラートをチェック    
        notification_count = NotificationService.check_price_alerts()

        elapsed_time = time.time() - start_time
        logger.info(f"価格アラートチェックタスクを完了しました - "
                    f"通知件数: {notification_count}件 - "
                    f"所要時間: {elapsed_time:.2f}秒")
        
        return notification_count
    
    except Exception as e:
        logger.error(f"価格アラートチェックタスクでエラーが発生しました: {str(e)}", exc_info=True)
        # Celeryにタスクの失敗を通知し、リトライを行う
        raise self.retry(exc=e)

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True
)
def send_price_alert_notifications(self):
    """
    価格アラート通知をメールで送信する定期タスク
    check_price_alertsの後に実行される
    """
    try:
        logger.info("価格アラート通知メール送信タスクを開始します")
        start_time = time.time()

        # 価格アラート通知をメールで送信
        result = EmailNotificationService.send_price_alert_notification()

        elapsed_time = time.time() - start_time

        logger.info(f"{result.get('message')} - "
                    f"success: {result.get('success')} - "
                    f"所要時間: {elapsed_time:.2f}秒")

        return result
        
    except Exception as e:
        logger.error(f"価格アラート通知メール送信中に予期せぬエラーが発生しました: {str(e)}", exc_info=True)
        # リトライを行う
        raise self.retry(exc=e)
    
