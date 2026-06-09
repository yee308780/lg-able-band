@echo off
setlocal
cd /d "%~dp0"
start "LGABLEBAND_FE_APP" cmd /k "cd /d ""%~dp0FE\app"" && npm run dev"
start "LGABLEBAND_FE_WEARABLE" cmd /k "cd /d ""%~dp0FE\wearable"" && npm run dev"
