@echo off
setlocal
cd /d "%~dp0"

call :restart_port 5173 LGABLEBAND_FE_APP "%~dp0FE\app" "npm run dev -- --host 0.0.0.0 --port 5173 --strictPort"
if errorlevel 1 exit /b %errorlevel%
call :restart_port 5174 LGABLEBAND_FE_WEARABLE "%~dp0FE\wearable" "npm run dev -- --host 0.0.0.0 --port 5174 --strictPort"
if errorlevel 1 exit /b %errorlevel%
exit /b 0

:restart_port
set "TARGET_PORT=%~1"
set "TARGET_NAME=%~2"
set "TARGET_DIR=%~3"
set "TARGET_COMMAND=%~4"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=%TARGET_PORT%; $listeners=Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue; if ($listeners) { $owners=@(); foreach ($listener in @($listeners)) { if ($owners -notcontains $listener.OwningProcess) { $owners += $listener.OwningProcess } }; Write-Host ('[RESTART] stopping ' + $owners.Count + ' process(es) on port ' + $port); foreach ($owner in $owners) { Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue } }; $deadline=(Get-Date).AddSeconds(10); while ((Get-Date) -lt $deadline) { if (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) { exit 0 }; Start-Sleep -Milliseconds 300 }; exit 1"
if errorlevel 1 (
  echo [WARN] %TARGET_NAME% could not release port %TARGET_PORT%.
  exit /b 1
)
start "%TARGET_NAME%" /D "%TARGET_DIR%" cmd /k "%TARGET_COMMAND%"
exit /b
