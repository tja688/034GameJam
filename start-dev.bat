@echo off
setlocal
cd /d "%~dp0"

set PORT=4173
set URL=http://127.0.0.1:%PORT%/index.html

echo [034GameJam] Starting dev server on %URL%
start "" powershell -NoProfile -Command "Start-Sleep -Milliseconds 900; Start-Process '%URL%'"

where py >nul 2>&1
if %errorlevel%==0 (
    py -3 tools\dev_server.py --host 127.0.0.1 --port %PORT%
) else (
    python tools\dev_server.py --host 127.0.0.1 --port %PORT%
)
