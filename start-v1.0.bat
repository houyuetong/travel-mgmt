@echo off
setlocal

rem ============================================
rem  Travel Management System V1.0 - Quick Start
rem  Server: .v10worktree  Port: 3010
rem  Opens http://localhost:3010 in browser
rem ============================================

set PORT=3010

echo.
echo Starting Travel Management System V1.0 (port 3010) ...
netstat -ano | findstr ":3010" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] V1.0 already running on port 3010
) else (
  start "TravelMgmt V1.0 (3010)" cmd /k "cd /d "%~dp0.v10worktree\server" && node src/app.js"
  timeout /t 4 /nobreak >nul
)

echo [OK] Opening http://localhost:3010
start "" "http://localhost:3010"
endlocal