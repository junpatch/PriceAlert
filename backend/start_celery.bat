@echo off
echo Starting Celery Services...

REM 仮想環境のアクティベーション
call .venv\Scripts\activate

REM PriceAlertディレクトリに移動
cd PriceAlert

REM Celery Workerの起動
echo Starting Celery Worker...
start cmd /k "celery -A PriceAlert worker --loglevel=info -P solo"

REM Celery Beatの起動
echo Starting Celery Beat...
start cmd /k "celery -A PriceAlert beat -S django --loglevel=info"

echo All services started successfully!
pause 