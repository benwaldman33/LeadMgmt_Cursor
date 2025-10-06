# Database Setup and Configuration Guide

## Overview

The LeadMgmt system uses **PostgreSQL 15** running in Docker for all data persistence. This document provides comprehensive information about the database setup, configuration, and troubleshooting.

## Current Database Configuration

### Database Type
- **Database**: PostgreSQL 15 (Alpine Linux)
- **Location**: Docker container
- **Container Name**: `leadmgmt_cursor-postgres-1`
- **Database Name**: `leadmgmt`
- **User**: `dev`
- **Password**: `devpass`

### Connection Details
- **Internal (Docker)**: `postgresql://dev:devpass@postgres:5432/leadmgmt`
- **External (Host)**: `postgresql://dev:devpass@localhost:5433/leadmgmt`
- **Port Mapping**: `5433:5432` (host:container)

### ORM Configuration
- **ORM**: Prisma
- **Provider**: PostgreSQL
- **Schema File**: `backend/prisma/schema.prisma`
- **Client Generation**: `npx prisma generate`

## Database Evolution History

### Phase 1: SQLite (Original)
- **Database**: SQLite (`dev.db`)
- **Location**: `backend/prisma/dev.db`
- **Status**: Deprecated, data lost during migration

### Phase 2: PostgreSQL (leadscoring_dev)
- **Database**: PostgreSQL (`leadscoring_dev`)
- **Location**: Docker container
- **Status**: Deprecated, data lost during database rename

### Phase 3: PostgreSQL (leadmgmt) - Current
- **Database**: PostgreSQL (`leadmgmt`)
- **Location**: Docker container
- **Status**: Active, current configuration

## Setup Instructions

### 1. Start Database Services
```bash
# Start all services including database
docker-compose up -d

# Or start only database services
docker-compose up -d postgres redis
```

### 2. Verify Database Connection
```bash
# Check if containers are running
docker-compose ps

# Test database connection
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT version();"
```

### 3. Apply Database Schema (Prisma Migrate)
```bash
cd backend

# Generate Prisma client
npx prisma generate

# Baseline (one-time if database already has the schema and you want to start tracking migrations):
# npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
# npx prisma migrate resolve --applied 0001_init

# Development changes (create & apply a new migration)
npx prisma migrate dev --name <change>

# Container/CI deploy
npx prisma migrate deploy
```

### 4. Verify Schema Application
```bash
# Check if tables were created
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "\dt"

# Check data counts
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT COUNT(*) as user_count FROM users; SELECT COUNT(*) as lead_count FROM leads; SELECT COUNT(*) as campaign_count FROM campaigns;"
```

## Configuration Files

### Docker Compose Configuration
```yaml
# docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: leadmgmt
    POSTGRES_USER: dev
    POSTGRES_PASSWORD: devpass
  ports:
    - "5433:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U dev -d leadmgmt"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Prisma Schema Configuration
```prisma
// backend/prisma/schema.prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Environment Variables
```bash
# Backend environment (Docker)
DATABASE_URL=postgresql://dev:devpass@postgres:5432/leadmgmt

# Host environment (for direct access)
DATABASE_URL=postgresql://dev:devpass@localhost:5433/leadmgmt
```

## Data Persistence

### Docker Volumes
- **Volume Name**: `postgres_data`
- **Location**: Docker managed volume
- **Purpose**: Persistent storage for PostgreSQL data
- **Backup**: Volume data persists across container restarts

### Data Status
- **Users**: 6 (from database seeding)
- **Leads**: 0 (lost during database transition)
- **Campaigns**: 0 (lost during database transition)
- **Workflows**: 0 (lost during database transition)

## Backup and Recovery

### Create Database Backup
```bash
# Create full database backup
docker exec leadmgmt_cursor-postgres-1 pg_dump -U dev -d leadmgmt > backup_$(date +%Y%m%d_%H%M%S).sql

# Create backup with data verification
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM leads; SELECT COUNT(*) FROM campaigns;" > data_check_$(date +%Y%m%d_%H%M%S).txt
```

### Restore Database Backup
```bash
# Restore from backup file
docker exec -i leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt < backup_file.sql
```

### Backup Script
The system includes a comprehensive backup script:
- **File**: `backup-leadmgmt.ps1`
- **Purpose**: Backup code, configuration, and database
- **Location**: Project root directory

## Troubleshooting

### Common Issues

#### Database Connection Refused
```bash
# Check if containers are running
docker-compose ps

# Restart database service
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

#### Schema Out of Sync
```bash
# Regenerate Prisma client
npx prisma generate

# Check migration status
npx prisma migrate status

# For dev changes, create a migration
npx prisma migrate dev --name <change>

# Check for datasource config
cat backend/prisma/schema.prisma | grep -A 3 "datasource db"
```

#### Missing Data
```bash
# Verify data exists
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT COUNT(*) as user_count FROM users; SELECT COUNT(*) as lead_count FROM leads; SELECT COUNT(*) as campaign_count FROM campaigns;"

# Check if data was lost during transitions
# (See Database Evolution History section)
```

### Diagnostic Commands

#### Check Database Status
```bash
# Container status
docker-compose ps

# Database connection
docker exec leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt -c "SELECT COUNT(*) FROM users;"

# Backend environment
docker exec leadmgmt_cursor-backend-1 env | grep DATABASE
```

#### Verify Configuration
```bash
# Prisma schema
cat backend/prisma/schema.prisma | grep -A 3 "datasource db"

# Docker Compose
cat docker-compose.yml | grep -A 10 "postgres:"

# Environment variables
docker exec leadmgmt_cursor-backend-1 env | grep -E "(DATABASE|POSTGRES)"
```

## Migration Notes

### From SQLite to PostgreSQL
- **Status**: Completed (data lost during migration)
- **Reason**: System moved to Docker-based PostgreSQL
- **Impact**: All previous data was lost

### From leadscoring_dev to leadmgmt
- **Status**: Completed (data lost during rename)
- **Reason**: Database name standardization
- **Impact**: All previous data was lost

### Future Migrations
- Always create data dumps before major configuration changes
- Test backup restoration procedures
- Verify data integrity after migrations
- Document all database changes

## Security Considerations

### Database Access
- **User**: `dev` (development only)
- **Password**: `devpass` (development only)
- **Network**: Docker internal network
- **Port**: Exposed on localhost:5433 (development only)

### Production Considerations
- Change default passwords
- Use environment variables for credentials
- Implement proper network security
- Use SSL/TLS connections
- Regular security updates

## Performance Optimization

### Database Tuning
- **Connection Pooling**: Configured via Prisma
- **Indexing**: Applied via Prisma schema
- **Query Optimization**: Use Prisma query optimization
- **Monitoring**: Use PostgreSQL monitoring tools

### Docker Optimization
- **Resource Limits**: Configure in docker-compose.yml
- **Volume Optimization**: Use appropriate volume drivers
- **Network Optimization**: Use Docker networks efficiently

## Support and Maintenance

### Regular Maintenance
- Monitor database logs
- Check disk space usage
- Verify backup integrity
- Update database versions
- Review security configurations

### Monitoring
- Database connection status
- Query performance
- Disk usage
- Memory usage
- Error logs

### Documentation Updates
- Keep this document updated with configuration changes
- Document any new database features
- Update troubleshooting procedures
- Maintain backup and recovery procedures

---

## Quick Reference

### Essential Commands
```bash
# Start database
docker-compose up -d postgres

# Check status
docker-compose ps

# Connect to database
docker exec -it leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt

# Backup database
docker exec leadmgmt_cursor-postgres-1 pg_dump -U dev -d leadmgmt > backup.sql

# Restore database
docker exec -i leadmgmt_cursor-postgres-1 psql -U dev -d leadmgmt < backup.sql
```

### Configuration Files
- `docker-compose.yml` - Docker service configuration
- `backend/prisma/schema.prisma` - Database schema
- `backend/.env` - Environment variables
- `backup-leadmgmt.ps1` - Backup script

### Important Notes
- Database is PostgreSQL 15 in Docker
- Data persists in Docker volumes
- Previous data was lost during migrations
- System is currently working correctly
- All new data will be properly persisted
