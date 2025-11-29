# NetViz Pro - Remote Server Automation Testing Guide

**Version:** 1.0
**Last Updated:** 2025-11-29
**Target Server:** 172.16.39.172 (Ubuntu 24.04.2 LTS)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [7-Phase Deployment Test](#3-7-phase-deployment-test)
4. [Manual Testing Commands](#4-manual-testing-commands)
5. [Validation Checklist](#5-validation-checklist)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Overview

This document describes how to perform automated deployment testing of NetViz Pro on remote server **172.16.39.172**.

### Server Details

| Property   | Value              |
|------------|--------------------|
| Server IP  | 172.16.39.172      |
| OS         | Ubuntu 24.04.2 LTS |
| Node.js    | v20.19.6           |
| npm        | 10.8.2             |
| Python     | 3.12.3             |
| SSH User   | vmuser             |

### Access URLs

| Service   | URL                            |
|-----------|--------------------------------|
| Frontend  | http://172.16.39.172:9040      |
| Auth API  | http://172.16.39.172:9041/api  |

### Default Credentials

```
Username: netviz_admin
Password: V3ry$trongAdm1n!2025
```

---

## 2. Prerequisites

### Local Machine Requirements

```bash
# Install sshpass for automated SSH (macOS)
brew install sshpass

# Or on Ubuntu/Debian
sudo apt-get install sshpass
```

### Network Requirements

- VPN/Tailscale connection to 172.16.39.x network
- SSH access to port 22
- Ports 9040 and 9041 accessible

### Verify Connectivity

```bash
# Test ping
ping -c 2 172.16.39.172

# Test SSH
sshpass -p "vmuser" ssh -o StrictHostKeyChecking=no vmuser@172.16.39.172 "echo 'SSH OK'"
```

---

## 3. 7-Phase Deployment Test

### Phase 1: Clean Environment

Remove existing Node.js, npm, and application files.

```bash
# Stop any running services
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "pkill -f 'node' 2>/dev/null; pkill -f 'npm' 2>/dev/null"

# Remove existing app directories
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "rm -rf ~/OSPF-LL-JSON ~/OSPF2-LL-JSON"

# Remove Node.js
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "echo vmuser | sudo -S apt-get remove -y nodejs npm"

# Verify cleanup
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "node --version 2>&1 || echo 'Node: REMOVED'"
```

**Expected Result:** Node.js and npm removed, app directories deleted.

---

### Phase 2: Install Node.js and npm

```bash
# Setup NodeSource repository
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"

# Install Node.js
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "echo vmuser | sudo -S apt-get install -y nodejs"

# Verify installation
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "node --version && npm --version"
```

**Expected Result:**
```
v20.19.6
10.8.2
```

---

### Phase 3: Verify Python 3.12

```bash
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "python3 --version"
```

**Expected Result:**
```
Python 3.12.3
```

---

### Phase 4: Clone Repository and Install Dependencies

```bash
# Clone repository
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~ && git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && mv OSPF2-LL-JSON OSPF-LL-JSON"

# Install npm dependencies
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~/OSPF-LL-JSON/netviz-pro && npm install"
```

**Expected Result:**
```
added 324 packages, and audited 325 packages in 8s
found 0 vulnerabilities
```

---

### Phase 5: Configure Environment and Start Services

```bash
# Create .env.local configuration
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cat > ~/OSPF-LL-JSON/netviz-pro/.env.local << 'EOF'
AUTH_PORT=9041
APP_SECRET_KEY=8ce6d45fb12a8b40e9d05f4c2a9df96b0f8e23d4ab7c90e1f6d75a2c8e9b3f4c5a6d7e8f9b0c1d2
APP_SESSION_TIMEOUT=3600
APP_ADMIN_USERNAME=netviz_admin
APP_ADMIN_PASSWORD=V3ry\$trongAdm1n!2025
APP_DEFAULT_MAX_USES=10
APP_EXPIRY_ENABLED=true
LOCALHOST_ONLY=false
ADMIN_RESET_PIN=12345
ALLOWED_ORIGINS=http://localhost:9040,http://127.0.0.1:9040,http://172.16.39.172:9040
EOF"

# Make scripts executable
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~/OSPF-LL-JSON/netviz-pro && chmod +x *.sh"

# Start services
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~/OSPF-LL-JSON/netviz-pro && ./start.sh"
```

**Expected Result:**
```
✓ App (9040) running
✓ Auth API (9041) running
NetViz Pro started successfully!
```

---

### Phase 6: Run Validation Tests

```bash
# Test Auth API Health
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "curl -s http://localhost:9041/api/health"

# Test Frontend HTTP Status
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "curl -s -o /dev/null -w '%{http_code}' http://localhost:9040"

# Test Login API
sshpass -p "vmuser" ssh vmuser@172.16.39.172 'cat > /tmp/test_login.sh << '\''ENDSCRIPT'\''
#!/bin/bash
curl -s -X POST http://localhost:9041/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"netviz_admin\",\"password\":\"V3ry\$trongAdm1n!2025\"}"
ENDSCRIPT
chmod +x /tmp/test_login.sh
/tmp/test_login.sh'

# Run status check
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~/OSPF-LL-JSON/netviz-pro && ./status.sh"
```

**Expected Results:**

| Test | Expected |
|------|----------|
| Health API | `{"status":"ok","service":"NetViz Pro Auth Server",...}` |
| Frontend HTTP | `200` |
| Login API | `{"success":true,"token":"..."}` |
| Status | `All services running!` |

---

### Phase 7: External Accessibility Check

Run these from your **local machine** (not the server):

```bash
# Test Frontend externally
curl -s -o /dev/null -w "%{http_code}" http://172.16.39.172:9040

# Test Auth API externally
curl -s http://172.16.39.172:9041/api/health

# Test Frontend HTML
curl -s http://172.16.39.172:9040 | head -10
```

**Expected Results:**

| Test | Expected |
|------|----------|
| Frontend HTTP | `200` |
| Auth API Health | `{"status":"ok",...}` |
| Frontend HTML | `<!DOCTYPE html>...NetViz Pro...` |

---

## 4. Manual Testing Commands

### Service Management

```bash
# SSH to server
sshpass -p "vmuser" ssh vmuser@172.16.39.172

# Navigate to app
cd ~/OSPF-LL-JSON/netviz-pro

# Start services
./start.sh

# Stop services
./stop.sh

# Restart services
./restart.sh

# Check status
./status.sh

# View logs
./logs.sh -f

# Reset authentication
./reset.sh --auth -y
```

### Health Checks

```bash
# From server
curl http://localhost:9041/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:9040

# From local machine
curl http://172.16.39.172:9041/api/health
curl http://172.16.39.172:9040
```

---

## 5. Validation Checklist

### Deployment Validation

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | Node.js installed | `node --version` | v20.x.x |
| 2 | npm installed | `npm --version` | 10.x.x |
| 3 | Python available | `python3 --version` | Python 3.12.x |
| 4 | App cloned | `ls ~/OSPF-LL-JSON/netviz-pro` | Files exist |
| 5 | Dependencies installed | `ls ~/OSPF-LL-JSON/netviz-pro/node_modules` | 300+ packages |
| 6 | Frontend running | `curl localhost:9040` | HTTP 200 |
| 7 | Auth API running | `curl localhost:9041/api/health` | `{"status":"ok"}` |

### Functional Validation

| # | Feature | How to Test | Expected |
|---|---------|-------------|----------|
| 1 | Login | Browser: http://172.16.39.172:9040 | Login form appears |
| 2 | Authentication | Login with credentials | Dashboard loads |
| 3 | File Upload | Upload topology JSON | Graph renders |
| 4 | Path Analysis | Select source/target | Path calculated |

---

## 6. Troubleshooting

### Services Not Starting

```bash
# Check logs
tail -50 /tmp/netviz-pro.log

# Check ports
ss -tlnp | grep -E '9040|9041'

# Kill stuck processes
pkill -f 'node.*netviz'
./start.sh
```

### Login Fails

```bash
# Reset authentication
./reset.sh --auth -y
./start.sh

# Check .env.local exists
cat ~/OSPF-LL-JSON/netviz-pro/.env.local
```

### Port Already in Use

```bash
# Find process using port
lsof -i:9040
lsof -i:9041

# Kill processes
./stop.sh
# Or force kill
lsof -ti:9040,9041 | xargs kill -9
```

### External Access Not Working

```bash
# Check LOCALHOST_ONLY setting
grep LOCALHOST_ONLY ~/OSPF-LL-JSON/netviz-pro/.env.local
# Should be: LOCALHOST_ONLY=false

# Check firewall
sudo ufw status
sudo ufw allow 9040
sudo ufw allow 9041
```

---

## Quick Reference

### One-Line Full Deploy Test

```bash
# Run all 7 phases in sequence
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "
  pkill -f node 2>/dev/null;
  rm -rf ~/OSPF-LL-JSON ~/OSPF2-LL-JSON;
  echo vmuser | sudo -S apt-get remove -y nodejs 2>/dev/null;
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -;
  echo vmuser | sudo -S apt-get install -y nodejs;
  git clone https://github.com/zumanm1/OSPF2-LL-JSON.git ~/OSPF-LL-JSON;
  cd ~/OSPF-LL-JSON/netviz-pro && npm install;
  chmod +x *.sh;
  ./start.sh;
  ./status.sh
"
```

### Quick Status Check

```bash
sshpass -p "vmuser" ssh vmuser@172.16.39.172 "cd ~/OSPF-LL-JSON/netviz-pro && ./status.sh"
```

---

## Summary of 7-Phase Test Results

| Phase | Description | Status |
|-------|-------------|--------|
| **1** | Clean environment (remove Node, npm) | ✅ PASS |
| **2** | Install Node.js 20.19.6 & npm 10.8.2 | ✅ PASS |
| **3** | Verify Python 3.12.3 | ✅ PASS |
| **4** | Clone repo & install dependencies | ✅ PASS |
| **5** | Configure .env.local & start services | ✅ PASS |
| **6** | Run validation tests (status, health, login) | ✅ PASS |
| **7** | External accessibility check | ✅ PASS |

---

*Document generated by Claude Code - 2025-11-29*
