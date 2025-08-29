@echo off
title Lead Management System - No Docker Startup
color 0B

echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM STARTUP
echo    (Without Docker - Direct Service Start)
echo ========================================
echo.

echo [1/4] Checking prerequisites...

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Node.js not found
    echo    Please install Node.js from https://nodejs.org/
    goto :end
)
echo    ✓ Node.js found

:: Check if PostgreSQL is installed and running
echo [2/4] Checking PostgreSQL...
sc query postgresql-x64-15 >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ PostgreSQL service not found
    echo    Please install PostgreSQL or ensure Docker is working
    goto :end
)
echo    ✓ PostgreSQL service found

:: Check if Redis is available
echo [3/4] Checking Redis...
where redis-server >nul 2>&1
if %errorlevel% neq 0 (
    echo    ⚠️  Redis not found locally
    echo    Will try to use Docker for Redis only
    set USE_DOCKER_REDIS=1
) else (
    echo    ✓ Redis found locally
    set USE_DOCKER_REDIS=0
)

echo.
echo [4/4] Starting services...

:: Start Redis if needed
if %USE_DOCKER_REDIS%==1 (
    echo Starting Redis with Docker...
    docker run -d --name redis-leadmgmt -p 6379:6379 redis:7-alpine
    if %errorlevel% neq 0 (
        echo    ❌ Failed to start Redis
        goto :end
    )
    echo    ✓ Redis started
)

:: Start backend
echo Starting backend...
cd backend
start "Backend" cmd /k "npm run dev"
cd ..

:: Start frontend
echo Starting frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo           STARTUP COMPLETE!
echo ========================================
echo.
echo Services started:
echo - Backend: http://localhost:3001
echo - Frontend: http://localhost:3000
echo - Database: localhost:5433
echo - Redis: localhost:6379
echo.
echo Note: Backend and Frontend are running in separate windows
echo Close those windows to stop the services
echo.

:end
echo Press any key to close this window...
pause >nul
