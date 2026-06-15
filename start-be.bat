@echo off
setlocal
cd /d "%~dp0"

call :start_if_free 8080 LGABLEBAND_BE "cd /d ""%~dp0BE"" && .\mvnw.cmd spring-boot:run"
exit /b

:start_if_free
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort %1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  start "%~2" cmd /k "%~3"
) else (
  echo [SKIP] %~2 is already running on port %1.
)
exit /b
