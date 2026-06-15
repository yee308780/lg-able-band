@echo off
setlocal
cd /d "%~dp0"
call "%~dp0start-ngrok.bat" 5174 FE/wearable
exit /b
