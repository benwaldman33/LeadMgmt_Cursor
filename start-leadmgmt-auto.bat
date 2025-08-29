@echo off
title Lead Management System - Silent Auto Startup
color 0A

:: Set working directory to script location
cd /d "%~dp0"

:: Log file for startup
set LOGFILE=startup.log
echo [%date% %time%] Starting Lead Management System >> %LOGFILE%

:: Wait for Docker Desktop to be ready (max 5 minutes)
echo [%date% %time%] Waiting for Docker Desktop... >> %LOGFILE%
set /a attempts=0
:wait_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    set /a attempts+=1
    if %attempts% geq 60 (
        echo [%date% %time%] ERROR: Docker Desktop not ready after 5 minutes >> %LOGFILE%
        exit /b 1
    )
    timeout /t 5 /nobreak >nul
    goto wait_docker
)

echo [%date% %time%] Docker Desktop ready >> %LOGFILE%

:: Start database services
echo [%date% %time%] Starting database services... >> %LOGFILE%
docker-compose up -d postgres redis

:: Wait for services to be healthy (max 3 minutes)
echo [%date% %time%] Waiting for services to be healthy... >> %LOGFILE%
set /a health_attempts=0
:wait_healthy
docker-compose ps postgres redis | findstr "healthy" >nul 2>&1
if %errorlevel% neq 0 (
    set /a health_attempts+=1
    if %health_attempts% geq 60 (
        echo [%date% %time%] ERROR: Services not healthy after 3 minutes >> %LOGFILE%
        exit /b 1
    )
    timeout /t 3 /nobreak >nul
    goto wait_healthy
)

echo [%date% %time%] Database services healthy >> %LOGFILE%

:: Start backend
echo [%date% %time%] Starting backend... >> %LOGFILE%
docker-compose up -d backend

:: Wait for backend to be ready
echo [%date% %time%] Waiting for backend to be ready... >> %LOGFILE%
set /a backend_attempts=0
:wait_backend
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    set /a backend_attempts+=1
    if %backend_attempts% geq 40 (
        echo [%date% %time%] ERROR: Backend not ready after 2 minutes >> %LOGFILE%
        exit /b 1
    )
    timeout /t 3 /nobreak >nul
    goto wait_backend
)

echo [%date% %time%] Backend ready >> %LOGFILE%

:: Final status check
echo [%date% %time%] Startup complete, checking final status... >> %LOGFILE%
docker-compose ps >> %LOGFILE%

:: Test health endpoint
curl -s http://localhost:3001/health >> %LOGFILE% 2>&1

echo [%date% %time%] Lead Management System startup completed successfully >> %LOGFILE%

:: Exit successfully
exit /b 0
