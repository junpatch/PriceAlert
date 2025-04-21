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
