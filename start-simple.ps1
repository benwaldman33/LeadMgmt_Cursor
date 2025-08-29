# Simple Lead Management System Startup

Write-Host "Starting Lead Management System..." -ForegroundColor Green

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
docker info
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker is ready" -ForegroundColor Green
} else {
    Write-Host "Docker not ready" -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d postgres redis
docker-compose up -d backend

Write-Host "Done!" -ForegroundColor Green
