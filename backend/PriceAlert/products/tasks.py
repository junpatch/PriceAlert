from celery import shared_task
import logging
from .services.price_service import PriceService

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True
)
def fetch_and_store_prices(self):
    """
    商品価格を取得して保存する定期タスク
    4時間ごとに実行される
    """
    try:
        logger.info("商品価格取得タスクを開始します")
        ps = PriceService()
        result = ps.fetch_price()
        logger.info(f"商品価格取得タスクが完了しました - {result}件の価格を更新しました")
        return f"{result}件の価格を更新しました"
    except Exception as e:
        logger.error(f"商品価格取得タスクでエラーが発生しました: {str(e)}", exc_info=True)
        # Celeryのリトライ機能を使用
        raise self.retry(exc=e)
