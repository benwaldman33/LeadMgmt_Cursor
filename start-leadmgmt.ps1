# Lead Management System Startup Script (PowerShell)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    LEAD MANAGEMENT SYSTEM STARTUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Check Docker Desktop
Write-Host "[1/5] Checking Docker Desktop..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "    ✓ Docker Desktop is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop not responding. Please ensure Docker Desktop is running." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Step 2: Start database services
Write-Host "[2/5] Starting database services..." -ForegroundColor Yellow
try {
    docker-compose up -d postgres redis | Out-Null
    Write-Host "    ✓ Database services started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start database services" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Step 3: Wait for services to be ready
Write-Host "[3/5] Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "    Waiting 30 seconds for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check if services are running
try {
    $services = docker-compose ps postgres redis
    if ($services -match "Up") {
        Write-Host "    ✓ Services are running" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Services may not be fully ready, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠️  Could not check service status, but continuing..." -ForegroundColor Yellow
}

# Step 4: Start backend
Write-Host "[4/5] Starting backend..." -ForegroundColor Yellow
try {
    docker-compose up -d backend | Out-Null
    Write-Host "    ✓ Backend started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start backend" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Step 5: Start frontend
Write-Host "[5/5] Starting frontend..." -ForegroundColor Yellow
try {
    docker-compose up -d frontend | Out-Null
    Write-Host "    ✓ Frontend started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start frontend" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Success
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "           STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "- Health Check: http://localhost:3001/health" -ForegroundColor White
Write-Host "- Database: localhost:5433" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "- Email: frontend-test@example.com" -ForegroundColor White
Write-Host "- Password: Test123!" -ForegroundColor White
Write-Host ""
Write-Host "Note: Services may take a few minutes to be fully ready" -ForegroundColor Yellow
Write-Host "Check the logs with: docker-compose logs -f" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to continue"
