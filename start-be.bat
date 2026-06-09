@echo off
setlocal
cd /d "%~dp0"
start "LGABLEBAND_BE" cmd /k "cd /d ""%~dp0BE"" && .\mvnw.cmd spring-boot:run"
