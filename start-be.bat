@echo off
setlocal
cd /d "%~dp0"

call :restart_port 8080 LGABLEBAND_BE "%~dp0BE" ".\mvnw.cmd spring-boot:run"
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
