@echo off
setlocal
cd /d "%~dp0"
start "LGABLEBAND_ML" cmd /k "cd /d ""%~dp0ML"" && python server.py"
