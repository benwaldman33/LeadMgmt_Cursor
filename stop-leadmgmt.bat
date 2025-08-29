@echo off
title Lead Management System - Stop Services
color 0C

echo.
echo ========================================
echo    STOPPING LEAD MANAGEMENT SYSTEM
echo ========================================
echo.

echo [1/2] Stopping all containers...
docker-compose down

echo [2/2] Checking if containers are stopped...
docker-compose ps

echo.
echo ========================================
echo           STOPPING COMPLETE!
echo ========================================
echo.
echo All Lead Management containers have been stopped.
echo.
echo To restart, run: start-leadmgmt.bat
echo.
pause
