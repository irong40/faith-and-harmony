@echo off
REM Start the full Sentinel processing stack
REM 1. NodeODM (Docker)  -> port 3000
REM 2. Processing Server -> port 8000

echo ============================================
echo  Sentinel Processing Stack
echo ============================================
echo.

REM 1. Start NodeODM if not running
docker ps --format "{{.Names}}" | findstr sentinel-nodeodm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting NodeODM...
    docker compose up -d nodeodm
    timeout /t 5 /nobreak >nul
) else (
    echo NodeODM already running.
)

echo.

REM 2. Start Processing Server in a new window
echo Starting Processing Server on port 8000...
start "Sentinel Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo ============================================
echo  Stack running:
echo    NodeODM:    http://localhost:3000
echo    Server:     http://localhost:8000
echo ============================================
echo.
echo Close the Server window to stop.
