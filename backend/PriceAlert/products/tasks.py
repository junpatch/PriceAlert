from PriceAlert.celery import app
from .services.price_service import PriceService
@app.task
def fetch_and_store_prices():
    print("hello celery")
    ps = PriceService()
    ps.fetch_price()
