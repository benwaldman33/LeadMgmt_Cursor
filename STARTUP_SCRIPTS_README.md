# 🚀 Lead Management System - Startup Scripts

This directory contains automated startup scripts for the Lead Management System using **Full Docker Experience**.

## 📁 Available Scripts

### 1. `start-leadmgmt-full.bat` - **RECOMMENDED** Full Docker Startup
- **Purpose**: Complete Docker startup with all services
- **Features**: 
  - Starts all services (frontend, backend, database, redis) in Docker
  - Shows progress step-by-step
  - Waits for user input before closing
  - Displays service status and health check
- **Best for**: Development, testing, production-like environment

### 2. `start-leadmgmt.bat` - Interactive Startup
- **Purpose**: Manual startup with visual feedback
- **Features**: 
  - Shows progress step-by-step
  - Waits for user input before closing
  - Displays service status and health check
- **Best for**: Development, testing, manual startup

### 3. `start-leadmgmt-auto.bat` - Silent Auto Startup
- **Purpose**: Automated startup without user interaction
- **Features**:
  - Runs silently in background
  - Logs all activities to `startup.log`
  - Automatic retry with timeout limits
  - Can be scheduled to run automatically
- **Best for**: Production, scheduled startup, automation

### 4. `stop-leadmgmt.bat` - Stop Services
- **Purpose**: Gracefully stop all containers
- **Features**: Stops all services and shows confirmation

### 5. `start-simple.ps1` - Simple PowerShell Startup
- **Purpose**: Quick PowerShell startup
- **Features**: Simple one-command startup
- **Best for**: PowerShell users, quick testing

## 🧪 **Testing Scripts**

### 6. `test-leadmgmt-system.bat` - Master Test Suite
- **Purpose**: Comprehensive testing with menu-driven interface
- **Features**:
  - System health checks
  - User creation and authentication tests
  - API endpoint testing
  - Database connection tests
  - AI service validation
  - Run all tests option
- **Best for**: Comprehensive testing, debugging, validation

### 7. `quick-test.bat` - Basic Health Check
- **Purpose**: Quick system validation
- **Features**:
  - Docker container status
  - Frontend connectivity
  - Backend health endpoint
  - Database connectivity
  - Redis connectivity
- **Best for**: Daily checks, quick validation

### 6. Individual Test Scripts
- **`create-test-user.js`** - Create test users for API testing
- **`debug-authentication.js`** - Test authentication flows
- **`test-market-discovery.js`** - Test market discovery APIs
- **`test-full-discovery-flow.js`** - Test complete discovery workflow
- **`backend/test-ai-discovery-debug.js`** - Test AI services and database

## 🎯 **Quick Start (Recommended)**

### **For Daily Development:**
```bash
# Start everything with one command
start-leadmgmt-full.bat
```

### **For Automated Startup:**
```bash
# Silent startup with logging
start-leadmgmt-auto.bat
```

## 🎯 **Complete Automated Startup Setup**

### **Step 1: Enable Docker Desktop Auto-Start**
1. Open Docker Desktop
2. Go to **Settings** → **General**
3. Check **"Start Docker Desktop when you log in"**
4. Click **"Apply & Restart"**

### **Step 2: Set Up Container Auto-Start**

#### **Option A: Windows Startup Folder (Recommended)**
1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy `start-leadmgmt-auto.bat` to this folder
3. Rename it to `start-leadmgmt-auto.bat` (remove the copy suffix)
4. The script will now run automatically after each login

#### **Option B: Task Scheduler**
1. Open **Task Scheduler** (search in Start menu)
2. Click **"Create Basic Task"**
3. Name: "Lead Management Startup"
4. Trigger: **"When I log on"**
5. Action: **"Start a program"**
6. Program: `C:\Windows\System32\cmd.exe`
7. Arguments: `/c "D:\Github\LeadMgmt_Cursor\LeadMgmt_Cursor\start-leadmgmt-auto.bat"`
8. Start in: `D:\Github\LeadMgmt_Cursor\LeadMgmt_Cursor`

## 🔄 **Startup Sequence**

After reboot, the system will automatically:

1. **Docker Desktop starts** (~1-2 minutes)
2. **Startup script runs** and waits for Docker
3. **PostgreSQL & Redis start** (~30 seconds)
4. **Backend starts** (~15 seconds)
5. **Frontend starts** (~15 seconds)
6. **Health check confirms** everything is working

**Total time**: ~2-3 minutes after login

## 🧪 **Testing Your System**

### **Quick Health Check**
```bash
quick-test.bat
```
Runs basic connectivity tests in under 30 seconds.

### **Comprehensive Testing**
```bash
test-leadmgmt-system.bat
```
Interactive menu to run specific tests or all tests.

### **Individual Test Scripts**
```bash
# Create test users
node create-test-user.js

# Test authentication
node debug-authentication.js

# Test market discovery
node test-market-discovery.js

# Test full discovery flow
node test-full-discovery-flow.js

# Test AI services (from backend directory)
cd backend && node test-ai-discovery-debug.js
```

## 📊 **Monitoring & Logs**

### **Check Startup Log**
```bash
type startup.log
```

### **Check Container Status**
```bash
docker-compose ps
```

### **Test Backend Health**
```bash
curl http://localhost:3001/health
```

### **View Container Logs**
```bash
docker-compose logs -f
```

## 🛠️ **Manual Commands**

### **Start Services Manually**
```bash
# Recommended: Full Docker startup
start-leadmgmt-full.bat

# Alternative: Step-by-step startup
start-leadmgmt.bat
```

### **Stop Services**
```bash
stop-leadmgmt.bat
```

### **Restart Services**
```bash
docker-compose restart
```

### **View Logs**
```bash
docker-compose logs -f
```

## ⚠️ **Troubleshooting**

### **Docker Desktop Not Starting**
- Check Windows Services for Docker Desktop
- Restart Docker Desktop manually
- Check system requirements

### **Containers Not Starting**
- Check `startup.log` for error messages
- Ensure Docker Desktop is fully ready
- Check available disk space and memory

### **Port Conflicts**
- Ensure ports 3001, 5433, and 6379 are available
- Stop any conflicting services

### **Test Failures**
- Run `quick-test.bat` to identify issues
- Check individual test outputs for specific errors
- Verify all services are running with `docker-compose ps`

## 🎉 **Result**

With this setup, your Lead Management System will:
- ✅ Start automatically after each reboot
- ✅ Wait for Docker Desktop to be ready
- ✅ Start all services in the correct order
- ✅ Verify everything is working
- ✅ Log all activities for monitoring
- ✅ Provide comprehensive testing capabilities
- ✅ Enable quick health checks

**No more manual startup required!** 🚀

## 📋 **Daily Workflow**

### **Morning Startup**
1. **System boots** → Docker Desktop starts automatically
2. **Containers start** → All services become available
3. **Quick validation** → Run `quick-test.bat` to confirm everything works

### **Testing & Development**
1. **Run specific tests** → Use `test-leadmgmt-system.bat` menu
2. **Debug issues** → Check individual test outputs
3. **Validate changes** → Run relevant test scripts

### **Evening Shutdown**
1. **Stop services** → Run `stop-leadmgmt.bat` if needed
2. **System ready** → For next day's automatic startup
