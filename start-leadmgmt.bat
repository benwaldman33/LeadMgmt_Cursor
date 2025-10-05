@echo off
title Lead Management System - Auto Startup
color 0A

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM STARTUP
echo ========================================
echo.

echo [1/4] Checking if Docker Desktop is running...
:wait_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo    Docker Desktop is not ready yet...
    echo    Please ensure Docker Desktop is running
    echo    Waiting 5 seconds before retry...
    timeout /t 5 /nobreak >nul
    goto wait_docker
)

echo    ✓ Docker Desktop is ready!
echo.

echo [2/4] Starting PostgreSQL and Redis containers...
docker-compose up -d postgres redis

echo    ✓ Database services started
echo.

echo [3/4] Waiting for database services to be healthy...
:wait_healthy
docker-compose ps postgres redis | findstr "healthy" >nul 2>&1
if %errorlevel% neq 0 (
    echo    Waiting for services to be healthy...
    timeout /t 3 /nobreak >nul
    goto wait_healthy
)

echo    ✓ Database services are healthy!
echo.

echo [4/5] Starting backend application...
docker-compose up -d backend

echo    ✓ Backend service started
echo.

echo [5/5] Starting frontend application...
docker-compose up -d frontend

echo    ✓ Frontend service started
echo.

echo.
echo ========================================
echo           STARTUP COMPLETE!
echo ========================================
echo.
echo Services Status:
docker-compose ps
echo.
echo Health Check:
curl -s http://localhost:3001/health
echo.
echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM READY
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:3001
echo Health Check: http://localhost:3001/health
echo Database: localhost:5433
echo Redis: localhost:6379
echo.
echo Login Credentials:
echo Email: frontend-test@example.com
echo Password: Test123!
echo.
echo Press any key to close this window...
pause >nul
