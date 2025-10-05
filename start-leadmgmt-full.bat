@echo off
title Lead Management System - Full Docker Startup
color 0A

:: Set working directory to script location
cd /d "%~dp0"

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM STARTUP
echo    (Full Docker Experience)
echo ========================================
echo.

echo [1/3] Checking Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Docker Desktop not responding
    echo    Please ensure Docker Desktop is running
    goto :end
)
echo    ✓ Docker Desktop is ready

echo.
echo [2/3] Starting all services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo    ❌ Failed to start services
    goto :end
)
echo    ✓ All services started

echo.
echo [3/3] Waiting for services to be ready...
echo    Waiting 30 seconds for services to initialize...
timeout /t 30 /nobreak >nul

:: Check if services are running
docker-compose ps | findstr "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️  Some services may not be fully ready, but continuing...
) else (
    echo    ✓ Services are running
)

echo.
echo ========================================
echo           STARTUP COMPLETE!
echo ========================================
echo.
echo Services Status:
docker-compose ps
echo.
echo URLs:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:3001
echo - Health Check: http://localhost:3001/health
echo - Database: localhost:5433
echo - Redis: localhost:6379
echo.
echo Login Credentials:
echo - Email: frontend-test@example.com
echo - Password: Test123!
echo.
echo Note: Services may take a few minutes to be fully ready
echo Check the logs with: docker-compose logs -f
echo.

:end
echo Press any key to close this window...
pause >nul
