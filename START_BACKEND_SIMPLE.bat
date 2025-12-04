@echo off
title PeerFuse Backend Server
echo ================================================
echo PeerFuse Backend Server
echo ================================================
echo.
echo Starting Flask server on http://localhost:5000
echo Keep this window open while using the website!
echo.
echo ================================================
echo.
cd backend
python app.py
echo.
echo Server stopped!
pause
