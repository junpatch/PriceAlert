#!/usr/bin/env bash
# Render.com用ビルドスクリプト

set -o errexit  # エラー発生時にスクリプトを終了

# Pythonパッケージをインストール
pip install -r requirements.txt

# 静的ファイルを収集
cd PriceAlert
python manage.py collectstatic --noinput

# マイグレーションを適用
python manage.py migrate

# logsディレクトリが存在しない場合は作成
mkdir -p logs 