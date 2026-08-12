@echo off
setlocal

rem ============================================
rem  Travel Management System V1.2 - Quick Start
rem  Server: .v12worktree  Port: 3012
rem  Opens http://localhost:3012 in browser
rem ============================================

set PORT=3012

echo.
echo Starting Travel Management System V1.2 (port 3012) ...
netstat -ano | findstr ":3012" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] V1.2 already running on port 3012
) else (
  start "TravelMgmt V1.2 (3012)" cmd /k "cd /d "%~dp0.v12worktree\server" && node src/app.js"
  timeout /t 4 /nobreak >nul
)

echo [OK] Opening http://localhost:3012
start "" "http://localhost:3012"
endlocal