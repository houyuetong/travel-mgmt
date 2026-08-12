@echo off
setlocal

rem ============================================
rem  Travel Management System V1.1 - Quick Start
rem  Server: .v11worktree  Port: 3011
rem  Opens http://localhost:3011 in browser
rem ============================================

set PORT=3011

echo.
echo Starting Travel Management System V1.1 (port 3011) ...
netstat -ano | findstr ":3011" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] V1.1 already running on port 3011
) else (
  start "TravelMgmt V1.1 (3011)" cmd /k "cd /d "%~dp0.v11worktree\server" && node src/app.js"
  timeout /t 4 /nobreak >nul
)

echo [OK] Opening http://localhost:3011
start "" "http://localhost:3011"
endlocal