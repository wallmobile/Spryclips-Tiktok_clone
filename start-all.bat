@echo off
title TikTok Clone - Starting All Servers
echo ========================================
echo   TikTok Clone - Starting Servers
echo ========================================
echo.
echo Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd /d %~dp0backend && node index.js"
echo Backend starting in new window...
echo.
timeout /t 3 /nobreak >nul 2>&1
echo.
echo Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"
echo Frontend starting in new window...
echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Keep both windows open while using the app.
echo Press any key to exit this window (servers will keep running)...
pause >nul

