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
```

### 開発サーバーの起動

```bash
# Django開発サーバーの起動
python manage.py runserver
```

### Celery の起動

```bash
# Celeryワーカーの起動
celery -A config worker --loglevel=info

# Celery Beatの起動（定期タスク用）
celery -A config beat --loglevel=info
```

## Docker Compose による開発環境

```bash
# 開発環境のコンテナを起動
docker-compose -f docker-compose.dev.yml up -d

# マイグレーションの実行
docker-compose -f docker-compose.dev.yml exec django python manage.py migrate

# 管理者ユーザーの作成
docker-compose -f docker-compose.dev.yml exec django python manage.py createsuperuser
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
├── config/                  # プロジェクト設定
│   ├── __init__.py          # Celery設定を含む
│   ├── asgi.py
│   ├── settings.py          # Django設定
│   ├── urls.py              # ルートURL設定
│   └── wsgi.py
├── accounts/                # ユーザー認証・管理アプリ
├── products/                # 商品管理アプリ
├── notifications/           # 通知管理アプリ
├── scraping/                # スクレイピング機能アプリ
├── core/                    # 共通機能・ユーティリティ
├── tests/                   # テストディレクトリ
├── manage.py                # Djangoコマンドラインツール
├── requirements.txt         # Python依存関係
├── .env                     # 環境変数（gitignoreに含める）
├── .env.example             # 環境変数のサンプル
├── setup.cfg                # 開発ツール設定
├── docker-compose.dev.yml   # 開発用Docker Compose
└── Dockerfile               # Dockerイメージ定義
```
