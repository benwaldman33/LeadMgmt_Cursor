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
docker-compose up -d

Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend: http://localhost:3001" -ForegroundColor White
Write-Host "- Database: localhost:5433" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
