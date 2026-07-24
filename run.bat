@echo off
echo ===================================================
echo BistroAnalytics - Restaurant Sales Analysis Project
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your system PATH.
    echo Please download and install Python from: https://www.python.org/downloads/
    echo During installation, make sure to check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo [INFO] Python detected.
echo [INFO] Installing required dependencies (Flask, mysql-connector-python)...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation failed. Retrying with --user option...
    python -m pip install --user -r requirements.txt
)

echo.
echo [INFO] Starting Flask server on http://127.0.0.1:5000
echo [INFO] Press Ctrl+C in this terminal window to stop the server.
echo.
python app.py
pause
