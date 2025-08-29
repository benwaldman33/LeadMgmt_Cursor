@echo off
title Lead Management System - Test Suite
color 0B

:menu
cls
echo.
echo ========================================
echo    LEAD MANAGEMENT SYSTEM TEST SUITE
echo ========================================
echo.
echo Available Tests:
echo.
echo [1] 🔧 System Health Check
echo [2] 👤 Create Test Users
echo [3] 🔐 Test Authentication
echo [4] 📊 Test Market Discovery API
echo [5] 🚀 Test Full Discovery Flow
echo [6] 🗄️  Test Database Connection
echo [7] 🧪 Test AI Discovery Services
echo [8] 📋 Run All Tests
echo [9] 🚪 Exit
echo.
echo ========================================
set /p choice="Select test to run (1-9): "

if "%choice%"=="1" goto health_check
if "%choice%"=="2" goto create_users
if "%choice%"=="3" goto test_auth
if "%choice%"=="4" goto test_market
if "%choice%"=="5" goto test_discovery
if "%choice%"=="6" goto test_db
if "%choice%"=="7" goto test_ai
if "%choice%"=="8" goto run_all
if "%choice%"=="9" goto exit
goto menu

:health_check
cls
echo.
echo ========================================
echo        SYSTEM HEALTH CHECK
echo ========================================
echo.
echo Checking if services are running...
echo.

echo [1/3] Checking Docker containers...
docker-compose ps
echo.

echo [2/3] Testing backend health...
curl -s http://localhost:3001/health
echo.

echo [3/3] Testing database connection...
docker exec leadmgmt_cursor-postgres-1 pg_isready -U dev -d leadscoring_dev
echo.

echo.
echo ========================================
echo           HEALTH CHECK COMPLETE
echo ========================================
echo.
pause
goto menu

:create_users
cls
echo.
echo ========================================
echo        CREATING TEST USERS
echo ========================================
echo.
echo Running test user creation script...
echo.

node create-test-user.js

echo.
echo ========================================
echo           USER CREATION COMPLETE
echo ========================================
echo.
pause
goto menu

:test_auth
cls
echo.
echo ========================================
echo        TESTING AUTHENTICATION
echo ========================================
echo.
echo Running authentication debug script...
echo.

node debug-authentication.js

echo.
echo ========================================
echo        AUTHENTICATION TEST COMPLETE
echo ========================================
echo.
pause
goto menu

:test_market
cls
echo.
echo ========================================
echo      TESTING MARKET DISCOVERY API
echo ========================================
echo.
echo Running market discovery test...
echo.

node test-market-discovery.js

echo.
echo ========================================
echo        MARKET DISCOVERY TEST COMPLETE
echo ========================================
echo.
pause
goto menu

:test_discovery
cls
echo.
echo ========================================
echo      TESTING FULL DISCOVERY FLOW
echo ========================================
echo.
echo Running full discovery flow test...
echo.

node test-full-discovery-flow.js

echo.
echo ========================================
echo        DISCOVERY FLOW TEST COMPLETE
echo ========================================
echo.
pause
goto menu

:test_db
cls
echo.
echo ========================================
echo      TESTING DATABASE CONNECTION
echo ========================================
echo.
echo Running database connection test...
echo.

cd backend
node test-ai-discovery-debug.js
cd ..

echo.
echo ========================================
echo        DATABASE TEST COMPLETE
echo ========================================
echo.
pause
goto menu

:test_ai
cls
echo.
echo ========================================
echo      TESTING AI DISCOVERY SERVICES
echo ========================================
echo.
echo Running AI discovery service test...
echo.

cd backend
node test-ai-discovery-debug.js
cd ..

echo.
echo ========================================
echo        AI SERVICES TEST COMPLETE
echo ========================================
echo.
pause
goto menu

:run_all
cls
echo.
echo ========================================
echo         RUNNING ALL TESTS
echo ========================================
echo.
echo This will run all tests in sequence...
echo.

echo [1/7] System Health Check...
docker-compose ps >nul 2>&1
curl -s http://localhost:3001/health >nul 2>&1
echo ✓ Health check complete

echo [2/7] Creating test users...
node create-test-user.js >nul 2>&1
echo ✓ Test users created

echo [3/7] Testing authentication...
node debug-authentication.js >nul 2>&1
echo ✓ Authentication tested

echo [4/7] Testing market discovery...
node test-market-discovery.js >nul 2>&1
echo ✓ Market discovery tested

echo [5/7] Testing full discovery flow...
node test-full-discovery-flow.js >nul 2>&1
echo ✓ Discovery flow tested

echo [6/7] Testing database...
cd backend
node test-ai-discovery-debug.js >nul 2>&1
cd ..
echo ✓ Database tested

echo [7/7] Testing AI services...
cd backend
node test-ai-discovery-debug.js >nul 2>&1
cd ..
echo ✓ AI services tested

echo.
echo ========================================
echo           ALL TESTS COMPLETE!
echo ========================================
echo.
echo Check individual test outputs for detailed results.
echo.
pause
goto menu

:exit
cls
echo.
echo ========================================
echo           TESTING COMPLETE
echo ========================================
echo.
echo Thank you for using the Lead Management System Test Suite!
echo.
exit /b 0
