@echo off
echo Bio Verim CRM baslatiliyor...
cd /d "%~dp0"
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
if exist ".next\dev\lock" del /f /q ".next\dev\lock" >nul 2>&1
echo Sunucu baslatiliyor: http://localhost:4000
start "" "http://localhost:4000"
node node_modules\next\dist\bin\next dev --port 4000
pause
