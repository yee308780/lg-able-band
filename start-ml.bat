@echo off
setlocal
cd /d "%~dp0"

call :start_if_free 8000 LGABLEBAND_CONTEXT_AI "cd /d ""%~dp0ML\context"" && python server.py"
call :start_if_free 8001 LGABLEBAND_WARNING_AI "cd /d ""%~dp0ML\warning"" && python server.py"
call :start_if_free 8002 LGABLEBAND_SOUND_CHATBOT "cd /d ""%~dp0ML\sound_chatbot"" && python server.py"
call :start_if_free 8004 LGABLEBAND_INFO_AGENT "cd /d ""%~dp0ML\info_agent"" && python info_agent_server.py"
call :start_if_free 8003 LGABLEBAND_EMERGENCY_AI "cd /d ""%~dp0ML\emergency"" && python server.py"
exit /b

:start_if_free
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort %1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  start "%~2" cmd /k "%~3"
) else (
  echo [SKIP] %~2 is already running on port %1.
)
exit /b
