@echo off
echo Starting Lead Management System...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting!
echo Backend: http://localhost:3001/health
echo Frontend: http://localhost:5173
echo.
echo Login credentials:
echo Email: frontend-test@example.com
echo Password: Test123!
echo.
pause
