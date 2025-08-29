# Lead Management System Startup Script (PowerShell)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    LEAD MANAGEMENT SYSTEM STARTUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Check Docker Desktop
Write-Host "[1/4] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerInfo = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop not responding. Please ensure Docker Desktop is running." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "    ✓ Docker Desktop is ready" -ForegroundColor Green

# Step 2: Start database services
Write-Host "[2/4] Starting database services..." -ForegroundColor Yellow
$result = docker-compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start database services" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "    ✓ Database services started" -ForegroundColor Green

# Step 3: Wait for services to be ready
Write-Host "[3/4] Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "    Waiting 30 seconds for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check if services are running
$services = docker-compose ps postgres redis 2>$null
if ($services -match "Up") {
    Write-Host "    ✓ Services are running" -ForegroundColor Green
} else {
    Write-Host "    ⚠️  Services may not be fully ready, but continuing..." -ForegroundColor Yellow
}

# Step 4: Start backend
Write-Host "[4/4] Starting backend..." -ForegroundColor Yellow
$result = docker-compose up -d backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start backend" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "    ✓ Backend started" -ForegroundColor Green

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
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "- Health Check: http://localhost:3001/health" -ForegroundColor White
Write-Host "- Database: localhost:5433" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Note: Services may take a few minutes to be fully ready" -ForegroundColor Yellow
Write-Host "Check the logs with: docker-compose logs -f" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to continue"
