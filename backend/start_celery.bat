@echo off
echo Starting Celery Services...

REM 仮想環境のアクティベーション
call .venv\Scripts\activate

REM PriceAlertディレクトリに移動
cd PriceAlert

REM PriceAlertの起動
echo Starting PriceAlert...
start /B cmd /c "python manage.py runserver"
if %ERRORLEVEL% EQU 0 (
    echo PriceAlert started successfully
) else (
    echo PriceAlert failed to start
    exit /b 1
)

REM Celery Workerの起動
echo Starting Celery Worker...
start /B cmd /c "celery -A PriceAlert worker --loglevel=info -P solo"
if %ERRORLEVEL% EQU 0 (
    echo Celery Worker started successfully
) else (
    echo Celery Worker failed to start
    exit /b 1
)

REM Celery Beatの起動
echo Starting Celery Beat...
start /B cmd /c "celery -A PriceAlert beat -S django --loglevel=info"
if %ERRORLEVEL% EQU 0 (
    echo Celery Beat started successfully
) else (
    echo Celery Beat failed to start
    exit /b 1
)

echo.
echo All services have been started successfully!
echo.
pause 