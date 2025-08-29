@echo off
title Lead Management System - Fixed Startup
color 0A

:: Set working directory to script location
cd /d "%~dp0"

:: Log file for startup
set LOGFILE=startup.log
echo [%date% %time%] Starting Lead Management System >> %LOGFILE%

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM STARTUP
echo ========================================
echo.

echo [1/4] Checking Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Docker Desktop not responding
    echo    Please ensure Docker Desktop is running
    goto :end
)
echo    ✓ Docker Desktop is ready

echo.
echo [2/4] Starting database services...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo    ❌ Failed to start database services
    goto :end
)
echo    ✓ Database services started

echo.
echo [3/4] Waiting for services to be ready...
:: Wait a reasonable time for services to start
echo    Waiting 30 seconds for services to initialize...
timeout /t 30 /nobreak >nul

:: Check if services are running (not necessarily healthy)
docker-compose ps postgres redis | findstr "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️  Services may not be fully ready, but continuing...
) else (
    echo    ✓ Services are running
)

echo.
echo [4/4] Starting backend...
docker-compose up -d backend
if %errorlevel% neq 0 (
    echo    ❌ Failed to start backend
    goto :end
)
echo    ✓ Backend started

echo.
echo ========================================
echo           STARTUP COMPLETE!
echo ========================================
echo.
echo Services Status:
docker-compose ps
echo.
echo URLs:
echo - Backend API: http://localhost:3001
echo - Health Check: http://localhost:3001/health
echo - Database: localhost:5433
echo - Redis: localhost:6379
echo.
echo Note: Services may take a few minutes to be fully ready
echo Check the logs with: docker-compose logs -f
echo.

:: Log completion
echo [%date% %time%] Startup completed successfully >> %LOGFILE%

:end
echo Press any key to close...
pause >nul
