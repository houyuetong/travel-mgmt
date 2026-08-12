@echo off
setlocal

rem ============================================
rem  Travel Management System V1.3 - Quick Start
rem  Server: .v13worktree  Port: 3013
rem  Opens http://localhost:3013 in browser
rem ============================================

set PORT=3013

echo.
echo Starting Travel Management System V1.3 (port 3013) ...
netstat -ano | findstr ":3013" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] V1.3 already running on port 3013
) else (
  start "TravelMgmt V1.3 (3013)" cmd /k "cd /d "%~dp0.v13worktree\server" && node src/app.js"
  timeout /t 4 /nobreak >nul
)

echo [OK] Opening http://localhost:3013
start "" "http://localhost:3013"
endlocal