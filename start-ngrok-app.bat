@echo off
setlocal
cd /d "%~dp0"
call "%~dp0start-ngrok.bat" 5173 FE/app
exit /b
