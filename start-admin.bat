@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://127.0.0.1:5177/admin.html';" ^
  "try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 | Out-Null; Start-Process $url; exit 0 } catch { }"
if %ERRORLEVEL% EQU 0 exit /b 0
node admin-server.js
pause
