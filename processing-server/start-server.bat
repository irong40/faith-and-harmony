@echo off
REM Start Sentinel Processing Server
REM Run this from the processing-server directory

echo Starting Sentinel Processing Server...
echo.

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated.
) else (
    echo WARNING: No virtual environment found. Run: python -m venv venv
    echo Then: pip install -r requirements.txt
)

echo.
echo Starting FastAPI on port 8000...
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
