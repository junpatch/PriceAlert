FROM python:3.12-slim

# 環境変数を設定
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LANG C.UTF-8
ENV TZ Asia/Tokyo
ENV PORT=8000

# 作業ディレクトリを設定
WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    postgresql-client \
    build-essential \
    libpq-dev \
    wget \
    unzip \
    gnupg \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Chrome for Selenium (本番環境でスクレイピングが必要な場合)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ChromeDriverをインストール
RUN CHROME_DRIVER_VERSION=$(wget -qO- https://chromedriver.storage.googleapis.com/LATEST_RELEASE) \
    && wget -q "https://chromedriver.storage.googleapis.com/${CHROME_DRIVER_VERSION}/chromedriver_linux64.zip" \
    && unzip chromedriver_linux64.zip -d /usr/local/bin/ \
    && rm chromedriver_linux64.zip \
    && chmod +x /usr/local/bin/chromedriver

# Python依存関係をインストール
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# プロジェクトのコードをコピー
COPY . /app/

# 静的ファイルを収集
RUN cd PriceAlert && python manage.py collectstatic --noinput

# logsディレクトリを作成
RUN mkdir -p /app/PriceAlert/logs && chmod -R 755 /app/PriceAlert/logs

# ポートを公開
EXPOSE $PORT

# 起動コマンド
CMD cd PriceAlert && gunicorn PriceAlert.wsgi:application --bind 0.0.0.0:$PORT --log-file - 