@echo off
REM Start Sentinel Processing Server
REM Run this from the processing-server directory

echo Starting Sentinel Processing Server...
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated.
) else (
    echo ERROR: No virtual environment found. Run: python -m venv venv
    echo Then: pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo Starting FastAPI on port 8000...
echo Health check: http://localhost:8000/api/health
echo.
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
