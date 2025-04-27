from celery import shared_task
import logging
from .services.price_service import PriceService
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
def fetch_and_store_prices(self):
    """
    商品価格を取得して保存する定期タスク
    4時間ごとに実行される
    """
    try:
        logger.info("商品価格取得タスクを開始します")
        start_time = time.time()
        
        ps = PriceService()
        result = ps.fetch_price()

        elapsed_time = time.time() - start_time
        logger.info(f"商品価格取得タスクが完了しました - "
                    f"新規商品: {result.get('new_ec_sites')}件 - "
                    f"価格更新: {result.get('new_price_histories')}件 - "
                    f"所要時間: {elapsed_time:.2f}秒")

        return result

    except Exception as e:
        logger.error(f"商品価格取得タスクでエラーが発生しました: {str(e)}", exc_info=True)
        # Celeryのリトライ機能を使用
        raise self.retry(exc=e)

def main():
    fetch_and_store_prices.delay() # type: ignore

if __name__ == "__main__":
    main()