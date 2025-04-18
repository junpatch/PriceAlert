from celery import shared_task
import logging
from .services import NotificationService
import time

logger = logging.getLogger(__name__)

@shared_task
def check_price_alerts():
    """
    価格アラートをチェックする定期タスク
    商品の価格が設定条件を満たした場合に通知を生成する
    """
    try:
        logger.info("価格アラートチェックタスクを開始します")
        start_time = time.time()
        
        # 価格アラートをチェック    
        notification_count = NotificationService.check_price_alerts()

        end_time = time.time()
        logger.info(f"価格アラートチェックタスクを完了しました。{notification_count}件の通知を作成しました。所要時間: {end_time - start_time}秒")
        return f"{notification_count}件の通知を作成しました"
    except Exception as e:
        logger.error(f"価格アラートチェックタスクでエラーが発生しました: {str(e)}", exc_info=True)
        # Celeryにタスクの失敗を通知するために例外を再発生
        raise 