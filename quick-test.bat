@echo off
title Lead Management System - Quick Test
color 0E

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM QUICK TEST
echo ========================================
echo.

echo [1/4] Checking Docker containers...
docker-compose ps
echo.

echo [2/4] Testing backend health...
curl -s http://localhost:3001/health
echo.

echo [3/4] Testing database connection...
docker exec leadmgmt_cursor-postgres-1 pg_isready -U dev -d leadscoring_dev
echo.

echo [4/4] Testing Redis connection...
docker exec leadmgmt_cursor-redis-1 redis-cli ping
echo.

echo.
echo ========================================
echo           QUICK TEST COMPLETE
echo ========================================
echo.
echo If all tests passed, your system is running correctly!
echo.
pause
