@echo off
setlocal
cd /d "%~dp0"
call "%~dp0start-all.bat"
call "%~dp0start-ngrok-app.bat"
echo Able Band app phone preview is starting.
echo Check the HTTPS forwarding URL at http://127.0.0.1:4040
exit /b
