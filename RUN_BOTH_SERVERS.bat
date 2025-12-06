@echo off
title TikTok Clone - Both Servers
color 0E
echo ========================================
echo Starting Both Servers (Backend + Frontend)
echo ========================================
echo.
echo Backend will run in one window
echo Frontend will run in another window
echo.
echo All messages, errors, and logs will appear in their respective windows!
echo.

REM Start Backend in new window
echo Starting Backend Server...
start "Backend Server - Port 5000" cmd /k "cd /d %~dp0backend && echo ======================================== && echo BACKEND SERVER - All messages appear here! && echo ======================================== && echo. && if exist node_modules (echo [OK] Dependencies found!) else (echo [INSTALL] Installing dependencies... && call npm install) && echo. && echo Starting server... && echo. && npm start"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Frontend in new window
echo Starting Frontend Server...
start "Frontend Server - Port 3000" cmd /k "cd /d %~dp0frontend && echo ======================================== && echo FRONTEND SERVER - All messages appear here! && echo ======================================== && echo. && if exist node_modules (echo [OK] Dependencies found!) else (echo [INSTALL] Installing dependencies... && call npm install) && echo. && echo Starting server... && echo. && npm start"

echo.
echo ========================================
echo Both servers are starting in separate windows!
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Check the separate windows for all server messages and errors.
echo ========================================
echo.
echo Press any key to close this window (servers will keep running)...
pause >nul






