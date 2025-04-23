# PriceAlert バックエンド

価格追跡システム「PriceAlert」のバックエンド実装です。Django REST Framework を使用した API サーバーと Celery による非同期処理で構成されています。

## 技術スタック

- Python 3.12
- Django 5.0
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- Selenium (スクレイピング)

## 開発環境のセットアップ

### 仮想環境のセットアップ

```bash
# 仮想環境の作成と有効化
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

### 環境変数の設定

`.env.example`ファイルを`.env`にコピーして、必要な環境変数を設定します。

```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定してください
```

### データベースのセットアップ

```bash
# マイグレーションの実行
python manage.py migrate

# 管理者ユーザーの作成
python manage.py createsuperuser

# 定期タスクの初期設定
python manage.py setup_periodic_tasks
```

### 開発サーバーの起動

```bash
# Django開発サーバーの起動
python manage.py runserver
```

### Celery の起動

```bash
# Celeryワーカーの起動
celery -A PriceAlert worker --loglevel=info

# Celery Beatの起動（定期タスク用）
celery -A PriceAlert beat -S django --loglevel=info
```

## Celery 定期タスク設定

本プロジェクトでは、django-celery-beat を使用して定期タスクをデータベースで管理しています。

### 定期実行されるタスク

以下の 3 つのタスクが定期的に実行されます：

1. **fetch_and_store_prices** - 商品価格取得タスク

   - 実行時間: 9 時、13 時、17 時、21 時（4 時間ごと）
   - 役割: 登録されている商品の最新価格を取得して保存

2. **check_price_alerts** - 価格アラートチェックタスク

   - 実行時間: 9:10、13:10、17:10、21:10（fetch_and_store_prices の 10 分後）
   - 役割: 価格条件が満たされた商品に対して通知を生成

3. **send_price_alert_notifications** - 通知送信タスク
   - 実行時間: 9:20、13:20、17:20、21:20（check_price_alerts の 10 分後）
   - 役割: 生成された通知をメールで送信

### 定期タスク設定方法

以下のコマンドを実行して定期タスクを設定します：

```bash
python manage.py setup_periodic_tasks
```

### 管理画面での設定変更

Django 管理画面 (`/admin/django_celery_beat/`) からスケジュールや設定を変更できます：

- **Periodic tasks**: タスクの有効/無効切り替え、スケジュール変更等
- **Crontab schedules**: 時間指定のスケジュール設定
- **Interval schedules**: 一定間隔のスケジュール設定

### エラーハンドリングとリトライ

各タスクには以下のエラーハンドリング・リトライ設定があります：

- 最大リトライ回数: 3 回
- 初回リトライ間隔: 30 秒
- バックオフ方式: 指数バックオフ（60 秒ずつ増加、最大 300 秒）

### その他の注意点

- 各タスクは独立して実行され、一つのタスクでエラーが発生しても他のタスクは実行されます
- 各タスクには実行期限（1 時間）が設定されており、長時間実行がブロックされることを防止しています
- タスクの実行ログは管理画面および標準ログで確認できます

## Docker Compose による開発環境

```bash
# 開発環境のコンテナを起動
docker-compose -f docker-compose.dev.yml up -d

# マイグレーションの実行
docker-compose -f docker-compose.dev.yml exec django python manage.py migrate

# 管理者ユーザーの作成
docker-compose -f docker-compose.dev.yml exec django python manage.py createsuperuser

# 定期タスクの初期設定
docker-compose -f docker-compose.dev.yml exec django python manage.py setup_periodic_tasks
```

## テストの実行

```bash
# 全テストの実行
python manage.py test

# 特定のアプリケーションのテスト実行
python manage.py test accounts

# pytest（推奨）
pytest
pytest -xvs  # 詳細なテスト出力

# カバレッジレポートの生成
coverage run -m pytest
coverage report
coverage html  # HTMLレポートの生成（htmlcov/index.htmlでアクセス）
```

## API エンドポイント

アプリケーションが起動したら、以下の URL から API ドキュメントにアクセスできます：

- API ルート: `http://localhost:8000/api/`
- 管理サイト: `http://localhost:8000/admin/`
- API ドキュメント: `http://localhost:8000/api/schema/swagger-ui/`

## プロジェクト構造

```
backend/
├── PriceAlert/               # プロジェクト設定
│   ├── __init__.py
│   ├── asgi.py
│   ├── celery.py            # Celery設定
│   ├── settings.py          # Django設定
│   ├── urls.py              # ルートURL設定
│   ├── wsgi.py
│   └── management/
│       └── commands/         # カスタム管理コマンド
│           └── setup_periodic_tasks.py  # 定期タスク設定コマンド
├── accounts/                # ユーザー認証・管理アプリ
├── products/                # 商品管理アプリ
│   └── tasks.py             # 商品関連のCeleryタスク
├── notifications/           # 通知管理アプリ
│   └── tasks.py             # 通知関連のCeleryタスク
├── manage.py                # Djangoコマンドラインツール
├── requirements.txt         # Python依存関係
├── .env                     # 環境変数（gitignoreに含める）
├── .env.example             # 環境変数のサンプル
└── docker-compose.yml       # Docker Compose設定
```

## Render.com へのデプロイ方法

このプロジェクトは、Render.com にデプロイするための設定が含まれています。以下の手順でデプロイを行ってください。

### 前提条件

- Render.com アカウント
- GitHub リポジトリにコードがプッシュされていること

### デプロイ手順

1. Render.com にログインし、ダッシュボードから「New +」ボタンをクリックします。

2. 「Web Service」を選択します。

3. GitHub からリポジトリを連携します。

4. 以下の設定を行います：

   - **Name**: `pricealert`（任意の名前）
   - **Environment**: `Python`
   - **Region**: 任意（アジアに近い地域を選択することをおすすめ）
   - **Branch**: `main`（使用するブランチ）
   - **Build Command**: `./build.sh`
   - **Start Command**: `cd PriceAlert && gunicorn PriceAlert.wsgi:application --log-file -`
   - **Plan**: Free（または必要に応じて他のプラン）

5. 以下の環境変数を設定します：

   - `DJANGO_ENVIRONMENT`: `production`
   - `SECRET_KEY`: ランダムな文字列（セキュリティのため）
   - `DEBUG`: `false`
   - `ALLOWED_HOSTS`: `pricealert-tpqq.onrender.com,price-alert-delta.vercel.app`
   - `DATABASE_URL`: Render.com が提供する PostgreSQL の接続 URL を設定する場合は自動で設定されます

6. 「Advanced」セクションを開き、以下を設定します：

   - **Auto-Deploy**: `Yes`

7. 「Create Web Service」をクリックして、デプロイを開始します。

### Celery Worker と Beat の設定

Celery ワーカーとスケジューラを設定するには：

1. Render.com ダッシュボードから「New +」→「Background Worker」を選択します。
2. 同じリポジトリを選択し、以下の設定を行います：

   - **Name**: `pricealert-worker`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd PriceAlert && celery -A PriceAlert worker -l info`
   - 環境変数は Web サービスと同じものを設定します

3. 同様に、Celery Beat も設定します：
   - **Name**: `pricealert-scheduler`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd PriceAlert && celery -A PriceAlert beat -l info`
   - 環境変数は Web サービスと同じものを設定します

### Redis の設定

Redis を使用するには：

1. Render.com ダッシュボードから「New +」→「Redis」を選択します。
2. 適切な名前（例：`pricealert-redis`）とプランを選択します。
3. 作成された Redis インスタンスの接続 URL（`REDIS_URL`環境変数の値）をコピーし、
   Web Service と Background Worker の環境変数に`CELERY_BROKER_URL`として追加します。

これらの手順を完了すると、Render.com 上でアプリケーションが動作するようになります。
