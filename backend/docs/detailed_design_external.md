# 外部連携設計書

## 1. 概要

本書では、PriceAlert システムと外部サービスとの連携に関する詳細設計を記述します。主に EC サイトの価格情報取得 API との連携、メール通知サービスとの連携、外部認証サービスとの連携について説明します。

## 2. EC サイト連携

### 2.1 連携先一覧

| EC サイト名        | 連携方法               | 認証方式    | レート制限      | フォールバック戦略 |
| ------------------ | ---------------------- | ----------- | --------------- | ------------------ |
| Amazon             | PA-API 5.0             | AWS 署名 v4 | 1 リクエスト/秒 | スクレイピング     |
| 楽天市場           | 楽天商品検索 API       | アプリ ID   | 1 リクエスト/秒 | スクレイピング     |
| Yahoo!ショッピング | Yahoo!ショッピング API | アプリ ID   | 5 リクエスト/秒 | スクレイピング     |

### 2.2 Amazon PA-API 連携詳細

#### 2.2.1 認証・認可

```python
import hmac
import hashlib
import base64
import datetime

def generate_amazon_auth_header(access_key, secret_key, region, host, method, uri, payload):
    # 現在時刻（ISO 8601形式）
    amz_date = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    date_stamp = datetime.datetime.utcnow().strftime('%Y%m%d')

    # 正規リクエスト作成
    canonical_uri = uri
    canonical_querystring = ''
    canonical_headers = f'host:{host}\nx-amz-date:{amz_date}\n'
    signed_headers = 'host;x-amz-date'
    payload_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
    canonical_request = f"{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"

    # 署名文字列作成
    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f"{date_stamp}/{region}/ProductAdvertisingAPI/aws4_request"
    string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"

    # 署名キー計算
    signing_key = get_signature_key(secret_key, date_stamp, region, 'ProductAdvertisingAPI')

    # 署名計算
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    # 認証ヘッダー作成
    auth_header = f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

    return {
        'Authorization': auth_header,
        'X-Amz-Date': amz_date
    }

def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = hmac.new(f'AWS4{key}'.encode('utf-8'), date_stamp.encode('utf-8'), hashlib.sha256).digest()
    k_region = hmac.new(k_date, region_name.encode('utf-8'), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service_name.encode('utf-8'), hashlib.sha256).digest()
    k_signing = hmac.new(k_service, b'aws4_request', hashlib.sha256).digest()
    return k_signing
```

#### 2.2.2 商品情報取得

```python
import requests
import json

class AmazonConnector:
    def __init__(self, access_key, secret_key, partner_tag, region='us-west-2', marketplace='www.amazon.co.jp'):
        self.access_key = access_key
        self.secret_key = secret_key
        self.partner_tag = partner_tag
        self.region = region
        self.host = f'webservices.{marketplace}'
        self.endpoint = f'https://{self.host}/paapi5/getitems'

    def fetch_product_info(self, asin):
        # リクエストペイロード作成
        payload = {
            "ItemIds": [asin],
            "Resources": [
                "Images.Primary.Large",
                "ItemInfo.Title",
                "ItemInfo.Features",
                "ItemInfo.ProductInfo",
                "Offers.Listings.Price",
                "Offers.Listings.LoyaltyPoints"
            ],
            "PartnerTag": self.partner_tag,
            "PartnerType": "Associates"
        }

        # 認証ヘッダー生成
        headers = generate_amazon_auth_header(
            self.access_key,
            self.secret_key,
            self.region,
            self.host,
            'POST',
            '/paapi5/getitems',
            json.dumps(payload)
        )

        # Content-Typeヘッダー追加
        headers['Content-Type'] = 'application/json; charset=utf-8'

        # リクエスト送信
        response = requests.post(
            self.endpoint,
            headers=headers,
            json=payload
        )

        # レスポンス処理
        if response.status_code == 200:
            result = response.json()
            if 'ItemsResult' in result and 'Items' in result['ItemsResult']:
                item = result['ItemsResult']['Items'][0]

                # 商品情報抽出
                product_info = {
                    'name': item.get('ItemInfo', {}).get('Title', {}).get('DisplayValue', ''),
                    'description': '\n'.join(item.get('ItemInfo', {}).get('Features', {}).get('DisplayValues', [])),
                    'image_url': item.get('Images', {}).get('Primary', {}).get('Large', {}).get('URL', ''),
                    'manufacturer': item.get('ItemInfo', {}).get('ByLineInfo', {}).get('Brand', {}).get('DisplayValue', ''),
                    'model_number': item.get('ItemInfo', {}).get('ProductInfo', {}).get('Model', {}).get('DisplayValue', ''),
                    'jan_code': '',  # PA-APIではJANコードは直接提供されない
                    'price': float(item.get('Offers', {}).get('Listings', [{}])[0].get('Price', {}).get('Amount', 0)),
                    'points': float(item.get('Offers', {}).get('Listings', [{}])[0].get('LoyaltyPoints', {}).get('Points', 0)),
                    'currency': item.get('Offers', {}).get('Listings', [{}])[0].get('Price', {}).get('Currency', 'JPY'),
                    'ec_product_id': asin,
                    'product_url': f"https://www.amazon.co.jp/dp/{asin}",
                    'in_stock': item.get('Offers', {}).get('Listings', [{}])[0].get('Availability', {}).get('Type') == 'Now'
                }

                return product_info

        # エラー処理
        raise Exception(f"Amazon API error: {response.status_code} - {response.text}")
```

### 2.3 楽天商品検索 API 連携詳細

#### 2.3.1 商品情報取得

```python
import requests

class RakutenConnector:
    def __init__(self, application_id, affiliate_id=None):
        self.application_id = application_id
        self.affiliate_id = affiliate_id
        self.endpoint = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706'

    def fetch_product_info(self, item_code):
        # リクエストパラメータ作成
        params = {
            'applicationId': self.application_id,
            'itemCode': item_code,
            'format': 'json'
        }

        if self.affiliate_id:
            params['affiliateId'] = self.affiliate_id

        # リクエスト送信
        response = requests.get(
            self.endpoint,
            params=params
        )

        # レスポンス処理
        if response.status_code == 200:
            result = response.json()
            if 'Items' in result and len(result['Items']) > 0:
                item = result['Items'][0]['Item']

                # 商品情報抽出
                product_info = {
                    'name': item.get('itemName', ''),
                    'description': item.get('itemCaption', ''),
                    'image_url': item.get('mediumImageUrls', [''])[0],
                    'manufacturer': item.get('shopName', ''),  # 楽天APIは製造元情報が直接提供されない
                    'model_number': '',  # 楽天APIは型番情報が直接提供されない
                    'jan_code': item.get('janCode', ''),
                    'price': float(item.get('itemPrice', 0)),
                    'points': float(item.get('points', 0)),
                    'currency': 'JPY',
                    'ec_product_id': item_code,
                    'product_url': item.get('itemUrl', ''),
                    'in_stock': item.get('availability', 0) == 1
                }

                return product_info

        # エラー処理
        raise Exception(f"Rakuten API error: {response.status_code} - {response.text}")
```

### 2.4 スクレイピングフォールバック

API 呼び出しが失敗した場合のフォールバックとしてスクレイピングを実装します：

```python
from bs4 import BeautifulSoup
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

class AmazonScraper:
    def __init__(self):
        # ヘッドレスChromeの設定
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless')
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')

    def fetch_product_info(self, url):
        # ブラウザ起動
        driver = webdriver.Chrome(options=self.chrome_options)

        try:
            # ページ読み込み
            driver.get(url)

            # ページが完全に読み込まれるまで待機
            driver.implicitly_wait(10)

            # HTML取得
            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            # 商品名
            product_title = soup.select_one('#productTitle')
            name = product_title.text.strip() if product_title else ''

            # 商品画像
            image_element = soup.select_one('#landingImage')
            image_url = image_element['src'] if image_element else ''

            # 価格
            price_element = soup.select_one('.a-price .a-offscreen')
            price_text = price_element.text.strip() if price_element else '0'
            price = float(price_text.replace('￥', '').replace(',', ''))

            # ポイント
            points_element = soup.select_one('#pointsValue')
            points_text = points_element.text.strip() if points_element else '0'
            points = float(points_text.replace('pt', '').replace(',', ''))

            # 在庫状態
            in_stock = 'in stock' in soup.select_one('#availability').text.lower() if soup.select_one('#availability') else False

            # ASIN取得（URLから）
            import re
            asin_match = re.search(r'/dp/([A-Z0-9]{10})', url)
            asin = asin_match.group(1) if asin_match else ''

            product_info = {
                'name': name,
                'description': '',  # スクレイピングでは説明文の取得は複雑なため省略
                'image_url': image_url,
                'manufacturer': '',  # スクレイピングでは製造元の取得は複雑なため省略
                'model_number': '',  # スクレイピングでは型番の取得は複雑なため省略
                'jan_code': '',  # スクレイピングではJANコードの取得は複雑なため省略
                'price': price,
                'points': points,
                'currency': 'JPY',
                'ec_product_id': asin,
                'product_url': url,
                'in_stock': in_stock
            }

            return product_info

        finally:
            # ブラウザ終了
            driver.quit()
```

## 3. メール配信サービス連携

### 3.1 SendGrid API 連携

価格アラート通知メールの送信には SendGrid API を使用します：

```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

class EmailService:
    def __init__(self, api_key):
        self.api_key = api_key
        self.from_email = Email("notification@pricealert.example.com", "PriceAlert")

    def send_price_alert(self, user_email, notification_data):
        try:
            # 宛先
            to_email = To(user_email)

            # メール件名
            subject = f"価格アラート: {notification_data['product_name']}の価格が下がりました！"

            # メール本文（HTML）
            html_content = f"""
            <html>
            <body>
                <h1>価格アラート</h1>
                <p>登録した商品の価格が下がりました！</p>
                <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
                    <h2>{notification_data['product_name']}</h2>
                    <p>
                        <strong>以前の価格:</strong> ¥{notification_data['old_price']:,}<br>
                        <strong>現在の価格:</strong> ¥{notification_data['new_price']:,}
                    </p>
                    <p><strong>{notification_data['site_name']}</strong>での価格です。</p>
                    <a href="{notification_data['link']}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; display: inline-block; margin-top: 10px;">
                        商品を見る
                    </a>
                </div>
                <p>
                    価格はリアルタイムに変動する場合があります。<br>
                    このメールは自動送信されています。
                </p>
            </body>
            </html>
            """

            content = Content("text/html", html_content)

            # メール作成
            message = Mail(self.from_email, to_email, subject, content)

            # メール送信
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            return response.status_code, "Email sent successfully"

        except Exception as e:
            return 500, f"Email sending failed: {str(e)}"
```

### 3.2 テンプレート管理

メールテンプレートは SendGrid の Dynamic Templates 機能を活用して管理します：

```python
def send_templated_email(self, user_email, template_id, dynamic_data):
    try:
        # 宛先
        to_email = To(user_email)

        # メール作成
        message = Mail(self.from_email, to_email)

        # テンプレートID設定
        message.template_id = template_id

        # パーソナライズデータ設定
        message.dynamic_template_data = dynamic_data

        # メール送信
        sg = SendGridAPIClient(self.api_key)
        response = sg.send(message)

        return response.status_code, "Templated email sent successfully"

    except Exception as e:
        return 500, f"Templated email sending failed: {str(e)}"
```

## 4. 外部認証サービス連携

### 4.1 Google OAuth 連携

Google アカウントでのログインを実装します：

```python
from google.oauth2 import id_token
from google.auth.transport import requests

def verify_google_token(token):
    try:
        # トークン検証
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)

        # 発行者確認
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        # ユーザー情報抽出
        user_info = {
            'email': idinfo['email'],
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
            'email_verified': idinfo.get('email_verified', False)
        }

        return user_info

    except Exception as e:
        # トークン検証失敗
        raise Exception(f"Invalid token: {str(e)}")
```

### 4.2 Twitter OAuth 連携

Twitter アカウントでのログインを実装します：

```python
import tweepy

def get_twitter_auth_url(callback_url):
    # Twitter OAuth1.0aハンドラー作成
    auth = tweepy.OAuthHandler(
        TWITTER_CONSUMER_KEY,
        TWITTER_CONSUMER_SECRET,
        callback_url
    )

    # リクエストトークン取得
    try:
        redirect_url = auth.get_authorization_url()
        # リクエストトークン保存
        request_token = auth.request_token

        return redirect_url, request_token

    except tweepy.TweepError:
        raise Exception("Error getting Twitter request token")

def get_twitter_access_token(oauth_verifier, request_token):
    # Twitter OAuth1.0aハンドラー作成
    auth = tweepy.OAuthHandler(
        TWITTER_CONSUMER_KEY,
        TWITTER_CONSUMER_SECRET
    )

    # リクエストトークンセット
    auth.request_token = request_token

    try:
        # アクセストークン取得
        auth.get_access_token(oauth_verifier)
        access_token = auth.access_token
        access_token_secret = auth.access_token_secret

        # ユーザー情報取得
        api = tweepy.API(auth)
        user = api.verify_credentials(include_email=True)

        user_info = {
            'twitter_id': user.id_str,
            'name': user.name,
            'screen_name': user.screen_name,
            'email': user.email,  # メールの取得には追加のアプリ権限が必要
            'profile_image_url': user.profile_image_url_https
        }

        return user_info, access_token, access_token_secret

    except Exception as e:
        raise Exception(f"Error getting Twitter access token: {str(e)}")
```

## 5. エラー処理・リトライ戦略

### 5.1 API 呼び出しのリトライ戦略

```python
import time
from functools import wraps

def retry(max_tries=3, delay_seconds=1, backoff_factor=2, exceptions=(Exception,)):
    """
    API呼び出しを指数バックオフでリトライするデコレータ
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            mtries, mdelay = max_tries, delay_seconds
            last_exception = None

            while mtries > 0:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    mtries -= 1
                    if mtries == 0:
                        break

                    time.sleep(mdelay)
                    mdelay *= backoff_factor

            raise last_exception

        return wrapper

    return decorator

# 使用例
@retry(max_tries=3, delay_seconds=2, backoff_factor=2, exceptions=(requests.RequestException,))
def fetch_amazon_product(asin):
    # Amazonから商品情報取得
    pass
```

### 5.2 障害時の代替戦略

```python
class ECConnectorFactory:
    def __init__(self):
        self.amazon_api = AmazonConnector(
            AMAZON_ACCESS_KEY,
            AMAZON_SECRET_KEY,
            AMAZON_PARTNER_TAG
        )
        self.amazon_scraper = AmazonScraper()
        # 他のECサイトコネクタも同様に初期化

    def get_amazon_product_info(self, asin):
        try:
            # まずAPIで取得を試みる
            return self.amazon_api.fetch_product_info(asin)
        except Exception as e:
            # API失敗時はスクレイピングにフォールバック
            try:
                url = f"https://www.amazon.co.jp/dp/{asin}"
                return self.amazon_scraper.fetch_product_info(url)
            except Exception as scraper_error:
                # 両方失敗した場合
                raise Exception(f"Failed to fetch Amazon product: {str(e)}, Scraper error: {str(scraper_error)}")
```

## 6. 連携モニタリング

### 6.1 API 呼び出し状況の記録

```python
import logging
from datetime import datetime

class APICallLogger:
    def __init__(self, db_session):
        self.db_session = db_session
        self.logger = logging.getLogger('api_calls')

    def log_api_call(self, service_name, endpoint, request_data, response_status, response_data=None, error=None):
        # ログ記録
        log_entry = {
            'service_name': service_name,
            'endpoint': endpoint,
            'request_data': request_data,
            'response_status': response_status,
            'response_data': response_data,
            'error': str(error) if error else None,
            'timestamp': datetime.utcnow()
        }

        # データベースに記録
        api_log = APICallLog(**log_entry)
        self.db_session.add(api_log)
        self.db_session.commit()

        # ロガーにも出力
        log_message = f"API Call: {service_name} - {endpoint} - Status: {response_status}"
        if error:
            self.logger.error(f"{log_message} - Error: {error}")
        else:
            self.logger.info(log_message)
```

### 6.2 API レート制限管理

```python
import redis
import time

class RateLimiter:
    def __init__(self, redis_client, service_name, max_calls, time_period):
        self.redis = redis_client
        self.service_name = service_name
        self.max_calls = max_calls
        self.time_period = time_period

    def acquire(self):
        """
        レート制限を確認し、リクエスト可能ならTrueを返す
        """
        current_time = int(time.time())
        key = f"rate_limit:{self.service_name}:{current_time // self.time_period}"

        # パイプラインでアトミックに操作
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.time_period)
        result = pipe.execute()

        current_count = result[0]

        # 制限内かチェック
        if current_count <= self.max_calls:
            return True

        # 制限超過
        return False

    def wait_if_needed(self):
        """
        レート制限に達していたら待機する
        """
        while not self.acquire():
            time.sleep(1)  # 1秒待機
```

## 7. セキュリティ対策

### 7.1 API 認証情報の管理

```python
from cryptography.fernet import Fernet

class APICredentialManager:
    def __init__(self, encryption_key):
        self.cipher = Fernet(encryption_key)

    def encrypt_credentials(self, credentials):
        """
        API認証情報を暗号化
        """
        return {
            key: self.cipher.encrypt(value.encode()).decode()
            for key, value in credentials.items()
        }

    def decrypt_credentials(self, encrypted_credentials):
        """
        暗号化されたAPI認証情報を復号
        """
        return {
            key: self.cipher.decrypt(value.encode()).decode()
            for key, value in encrypted_credentials.items()
        }

    def get_service_credentials(self, service_name, db_session):
        """
        サービス名からAPI認証情報を取得
        """
        # データベースから暗号化された認証情報を取得
        encrypted_creds = db_session.query(APICredential).filter_by(service_name=service_name).first()

        if not encrypted_creds:
            raise ValueError(f"No credentials found for service: {service_name}")

        # 認証情報を復号
        creds_dict = {
            'api_key': encrypted_creds.api_key,
            'api_secret': encrypted_creds.api_secret,
            'access_token': encrypted_creds.access_token,
            'refresh_token': encrypted_creds.refresh_token
        }

        return self.decrypt_credentials(creds_dict)
```
