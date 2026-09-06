@echo off
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo Starting Z Fit React Frontend on http://localhost:5173...
call npm run dev
pause
