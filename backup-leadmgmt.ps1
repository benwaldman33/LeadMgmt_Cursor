# LeadMgmt System Backup Script
# Simple and robust backup script

param(
    [string]$BackupPath = "D:\Backups"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupBase = Join-Path $BackupPath "LeadMgmt_Backup_$timestamp"

Write-Host "=== LeadMgmt System Backup ===" -ForegroundColor Green
Write-Host "Creating backup: $backupBase" -ForegroundColor Yellow
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Path $backupBase -Force | Out-Null
Write-Host "1. Created backup directory" -ForegroundColor Green

# Backup backend (excluding node_modules)
if (Test-Path "backend") {
    $backendDest = "$backupBase\backend"
    robocopy "backend" $backendDest /E /XD node_modules dist build .git /XF *.log | Out-Null
    Write-Host "2. Backed up backend code" -ForegroundColor Green
} else {
    Write-Host "2. Backend directory not found" -ForegroundColor Yellow
}

# Backup frontend (excluding node_modules)
if (Test-Path "frontend") {
    $frontendDest = "$backupBase\frontend"
    robocopy "frontend" $frontendDest /E /XD node_modules dist build .git /XF *.log | Out-Null
    Write-Host "3. Backed up frontend code" -ForegroundColor Green
} else {
    Write-Host "3. Frontend directory not found" -ForegroundColor Yellow
}

# Backup root files
$rootFiles = @("*.md", "*.json", "*.yml", "*.yaml", "*.bat", "*.ps1", "*.js", "*.txt")
foreach ($pattern in $rootFiles) {
    Get-ChildItem -Path "." -Name $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_ -Destination $backupBase -Force
    }
}
Write-Host "4. Backed up root configuration files" -ForegroundColor Green

# Backup database if Docker is running
try {
    $dockerRunning = docker ps --format "table {{.Names}}" 2>$null | Select-String "postgres"
    if ($dockerRunning) {
        $dbBackupFile = "$backupBase\leadscoring_dev_backup.sql"
        docker exec leadmgmt_cursor-postgres-1 pg_dump -U dev -d leadscoring_dev > $dbBackupFile
        Write-Host "5. Backed up database" -ForegroundColor Green
    } else {
        Write-Host "5. Database backup skipped (Docker not running)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "5. Database backup failed" -ForegroundColor Red
}

# Create restore instructions
$instructions = @"
LeadMgmt System Backup
======================

Backup Location: $backupBase
Created: $(Get-Date)

RESTORE INSTRUCTIONS:
====================

1. Extract backup to desired location
2. Start Docker: docker-compose up postgres redis -d
3. Restore database: docker exec -i leadmgmt_cursor-postgres-1 psql -U dev -d leadscoring_dev < leadscoring_dev_backup.sql
4. Install dependencies: cd backend && npm install && cd ../frontend && npm install
5. Start services: docker-compose up -d
6. Verify: Frontend http://localhost:3000, Backend http://localhost:3001

If operation mappings are missing: cd backend && node create-operation-mappings.js
"@

$instructions | Out-File -FilePath "$backupBase\RESTORE_INSTRUCTIONS.txt" -Encoding UTF8
Write-Host "6. Created restore instructions" -ForegroundColor Green

# Create compressed archive
$zipFile = "$backupBase.zip"
Compress-Archive -Path "$backupBase\*" -DestinationPath $zipFile -Force
Remove-Item -Path $backupBase -Recurse -Force

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host ""
Write-Host "=== BACKUP COMPLETED ===" -ForegroundColor Green
Write-Host "Backup file: $zipFile" -ForegroundColor Yellow
Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backup includes:" -ForegroundColor Cyan
Write-Host "- Complete source code (backend + frontend)" -ForegroundColor White
Write-Host "- Database dump (if available)" -ForegroundColor White
Write-Host "- Configuration files" -ForegroundColor White
Write-Host "- Restore instructions" -ForegroundColor White
