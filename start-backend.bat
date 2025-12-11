@echo off
title TikTok Clone Backend Server
echo ========================================
echo   TikTok Clone Backend Server
echo   Starting on port 5000...
echo ========================================
echo.
cd /d "%~dp0backend"
if not exist "index.js" (
    echo ERROR: index.js not found!
    echo Please make sure you're running this from the project root.
    pause
    exit /b 1
)
echo Current directory: %CD%
echo.
echo Starting server...
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.
node index.js
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Server failed to start!
    echo Check the error messages above.
    echo ========================================
    pause
)

