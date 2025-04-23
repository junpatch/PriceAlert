#!/usr/bin/env bash
# Render.com用ビルドスクリプト

set -o errexit  # エラー発生時にスクリプトを終了

# プロジェクト構造を確認
echo "現在のディレクトリ構造:"
ls -la

# Pythonパッケージをインストール
pip install -r requirements.txt

# ディレクトリを確認
if [ -d "backend" ]; then
  cd backend
  echo "backendディレクトリが存在し、移動しました"
fi

# 環境変数を設定
export DJANGO_SETTINGS_MODULE=PriceAlert.settings

# 静的ファイルを収集
cd PriceAlert
python manage.py collectstatic --noinput

# マイグレーションを適用
python manage.py migrate

# logsディレクトリが存在しない場合は作成
mkdir -p logs 