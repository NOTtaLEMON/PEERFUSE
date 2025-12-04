@echo off
title PeerFuse - Starting All Services
color 0A

echo ========================================
echo    PEERFUSE - AUTO START
echo ========================================
echo.
echo Starting backend server...
echo.

:: Start backend in a new window
start "PeerFuse Backend" cmd /k "cd /d "%~dp0backend" && python app.py"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo Backend started!
echo.
echo Starting frontend server...
echo.

:: Start frontend in a new window
start "PeerFuse Frontend" cmd /k "cd /d "%~dp0" && python -m http.server 8000"

:: Wait a moment for frontend to start
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    ALL SERVICES STARTED!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:8000
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:8000/index.html

echo.
echo ========================================
echo IMPORTANT: Keep the Backend and Frontend 
echo windows open while using PeerFuse!
echo ========================================
echo.
echo Press any key to exit this window (services will keep running)
pause >nul
