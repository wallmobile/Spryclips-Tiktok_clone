@echo off
title Frontend Server - TikTok Clone
color 0B
echo ========================================
echo Starting Frontend Server
echo ========================================
echo.
echo NOTE: All server messages, errors, and logs will appear here!
echo.

cd /d "%~dp0frontend"

echo Current Directory:
cd
echo.

echo Checking if node_modules exists...
if exist "node_modules" (
    echo [OK] node_modules folder found!
) else (
    echo [WARN] node_modules not found. Installing dependencies...
    echo.
    call npm install
    echo.
    if exist "node_modules" (
        echo [OK] Dependencies installed successfully!
    ) else (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Starting React Development Server...
echo All console.log, errors, and messages will show below:
echo ========================================
echo.

REM Run npm start - all output will appear in this window
call npm start

REM If server stops, show message
echo.
echo ========================================
echo Server stopped!
echo ========================================
pause






