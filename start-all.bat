@echo off
setlocal
cd /d "%~dp0"
call "%~dp0start-be.bat"
call "%~dp0start-fe.bat"
call "%~dp0start-ml.bat"
echo Able Band server start checks completed.
