@echo off
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Install Python 3, then run this launcher again.
  pause
  exit /b 1
)
python server.py
echo.
echo QueryLab stopped.
pause
