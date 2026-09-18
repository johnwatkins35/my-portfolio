@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "HOST=127.0.0.1"
set "PORT=8088"
set "URL=http://%HOST%:%PORT%/"
set "LOG=%~dp0sysdesk-launcher.log"

echo ===== SysDesk launch %DATE% %TIME% =====>> "%LOG%"

REM Free 8088 so a previous Python or Docker bind does not block.
powershell -NoProfile -Command ^
  "$pids = @(Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($procId in $pids) { if ($procId) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } }" >> "%LOG%" 2>&1
timeout /t 1 /nobreak >nul

docker info >nul 2>&1
if not errorlevel 1 (
  echo Starting SysDesk in Docker...>> "%LOG%"
  docker compose up -d >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo Docker compose failed, using Python...>> "%LOG%"
    goto PYTHON
  )
  goto WAIT
)

:PYTHON
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo FAIL: no Docker engine and no python>> "%LOG%"
    msg * "SysDesk: Docker is closed and Python was not found. Start Docker Desktop or install Python."
    exit /b 1
  )
  echo Starting Python server...>> "%LOG%"
  start "SysDesk" /MIN py -3 -m http.server %PORT% --bind %HOST%
  goto WAIT
)
echo Starting Python server...>> "%LOG%"
start "SysDesk" /MIN python -m http.server %PORT% --bind %HOST%

:WAIT
set /a tries=0
:LOOP
set /a tries+=1
curl.exe -fsS --max-time 2 "%URL%" >nul 2>&1
if not errorlevel 1 goto OPEN
if %tries% GEQ 40 goto FAIL
timeout /t 1 /nobreak >nul
goto LOOP

:FAIL
echo FAIL: not ready>> "%LOG%"
msg * "SysDesk did not start. Check sysdesk-launcher.log. If Docker is closed, Python needs to be on PATH."
exit /b 1

:OPEN
echo OK ready>> "%LOG%"
start "" "%URL%"
exit /b 0
