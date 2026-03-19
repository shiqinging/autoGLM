@echo off
echo ========================================
echo   Open-AutoGLM Web UI Launcher
echo ========================================
echo.

REM Create virtual environment if it doesn't exist
if not exist ".venv\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install project dependencies
echo Installing project dependencies...
pip install -r requirements.txt

REM Install current package in editable mode
echo Installing current package in editable mode...
pip install -e .

echo.
echo Starting Web UI...
echo Open http://localhost:7860 in your browser
echo.

python webui.py --inbrowser --port 7860

pause
