@echo off
setlocal

rem ============================================
rem  Travel Management System - Quick Start
rem  Opens http://localhost:3001 in browser
rem ============================================

echo.
echo Checking port 3001 ...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] Server already running on port 3001
) else (
  echo [..] Starting server ...
  start "TravelMgmt Server" cmd /k "cd /d "%~dp0server" && node start-server.js"
  timeout /t 3 /nobreak >nul
)

echo [OK] Opening http://localhost:3001
start "" "http://localhost:3001"
endlocal