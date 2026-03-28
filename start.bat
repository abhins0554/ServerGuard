@echo off
echo 🛡️ ServerGuard - Windows Startup Script
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    echo Please install npm (comes with Node.js)
    pause
    exit /b 1
)

echo [INFO] Ready to start ServerGuard
echo.

REM Run the Python startup script
python start.py

if errorlevel 1 (
    echo [ERROR] ServerGuard failed to start correctly.
)

pause