@echo off
title Docker Status Check
color 0E

echo.
echo ========================================
echo         DOCKER STATUS CHECK
echo ========================================
echo.

echo [1/3] Checking if Docker Desktop is installed...
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Docker CLI not found in PATH
    echo    Please install Docker Desktop
    goto :end
)
echo    ✓ Docker CLI found

echo.
echo [2/3] Checking Docker Desktop status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Docker Desktop not responding
    echo    This usually means:
    echo    - Docker Desktop is not running
    echo    - Docker Desktop is still starting up
    echo    - There's a Docker configuration issue
    echo.
    echo    Please:
    echo    1. Open Docker Desktop
    echo    2. Wait for it to fully start (green status)
    echo    3. Try again
) else (
    echo    ✓ Docker Desktop is responding
    echo.
    echo Docker version:
    docker --version
    echo.
    echo Docker info:
    docker info
)

echo.
echo [3/3] Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Docker Compose not found
) else (
    echo    ✓ Docker Compose found
    docker-compose --version
)

:end
echo.
echo ========================================
echo Press any key to close...
pause >nul
