@echo off
setlocal

rem ============================================
rem  Travel Management System V1.4 - Quick Start
rem  Server: ./server (root)  Port: 3001
rem  Opens http://localhost:3001 in browser
rem ============================================

set PORT=3001

echo.
echo Starting Travel Management System V1.4 (port 3001) ...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] V1.4 already running on port 3001
) else (
  start "TravelMgmt V1.4 (3001)" cmd /k "cd /d "%~dp0server" && node src/app.js"
  timeout /t 4 /nobreak >nul
)

echo [OK] Opening http://localhost:3001
start "" "http://localhost:3001"
endlocal