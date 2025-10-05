@echo off
title Lead Management System - Hybrid Startup
color 0B

:: Set working directory to script location
cd /d "%~dp0"

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM STARTUP
echo    (Hybrid: Choose Docker or Local)
echo ========================================
echo.

echo Choose startup mode:
echo.
echo [1] Full Docker (Recommended)
echo [2] Hybrid (Database in Docker, Apps locally)
echo [3] Exit
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto full_docker
if "%choice%"=="2" goto hybrid
if "%choice%"=="3" goto exit
goto invalid

:full_docker
echo.
echo ========================================
echo    STARTING FULL DOCKER SETUP
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
echo [2/3] Starting all services in Docker...
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
goto :end

:hybrid
echo.
echo ========================================
echo    STARTING HYBRID SETUP
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
echo [2/4] Starting database services in Docker...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo    ❌ Failed to start database services
    goto :end
)
echo    ✓ Database services started

echo.
echo [3/4] Waiting for database services to be ready...
echo    Waiting 30 seconds for services to initialize...
timeout /t 30 /nobreak >nul

echo.
echo [4/4] Starting applications locally...
echo    Starting backend...
cd backend
start "Backend" cmd /k "npm run dev"
cd ..

echo    Starting frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo           STARTUP COMPLETE!
echo ========================================
echo.
echo Services Status:
docker-compose ps postgres redis
echo.
echo URLs:
echo - Frontend: http://localhost:5173 (local)
echo - Backend API: http://localhost:3001 (local)
echo - Database: localhost:5433 (Docker)
echo - Redis: localhost:6379 (Docker)
echo.
echo Login Credentials:
echo - Email: frontend-test@example.com
echo - Password: Test123!
echo.
echo Note: Backend and Frontend are running in separate windows
echo Close those windows to stop the applications
echo.
goto :end

:invalid
echo.
echo ❌ Invalid choice. Please enter 1, 2, or 3.
echo.
goto :end

:exit
echo.
echo Goodbye!
exit /b 0

:end
echo.
echo Press any key to close this window...
pause >nul
