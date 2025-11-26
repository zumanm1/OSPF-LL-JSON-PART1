# NetViz Pro - Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Install (One-Liner)](#quick-install-one-liner)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Verify Installation](#verify-installation)
5. [Running the Application](#running-the-application)
6. [Accessing from Other Machines](#accessing-from-other-machines)
7. [Troubleshooting](#troubleshooting)
8. [Uninstall](#uninstall)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Check Command |
|----------|-----------------|---------------|
| Node.js | v18.0.0+ | `node --version` |
| npm | v9.0.0+ | `npm --version` |
| git | v2.0+ | `git --version` |

### Install Prerequisites

#### Ubuntu/Debian Linux
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git
sudo apt install -y git curl

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
git --version    # Should show git version 2.x.x
```

#### CentOS/RHEL/Fedora
```bash
# Install git
sudo yum install -y git curl

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify
node --version
npm --version
```

#### macOS
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and git
brew install node@20 git

# Verify
node --version
npm --version
```

#### Windows
1. Download Node.js from https://nodejs.org/ (LTS version)
2. Run the installer
3. Open Command Prompt or PowerShell
4. Verify: `node --version` and `npm --version`

---

## Quick Install (One-Liner)

```bash
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && cd OSPF2-LL-JSON/netviz-pro && npm install && npm run dev
```

---

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
# Navigate to your preferred directory
cd ~

# Clone the repository
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git

# Expected output:
# Cloning into 'OSPF2-LL-JSON'...
# remote: Enumerating objects: xxx, done.
# ...
```

### Step 2: Navigate to Project Directory

```bash
cd OSPF2-LL-JSON/netviz-pro

# Verify you're in the right place
ls -la
# Should see: App.tsx, package.json, components/, utils/, etc.
```

### Step 3: Install Dependencies

```bash
npm install

# Expected output:
# added XXX packages, and audited XXX packages in Xm
# found 0 vulnerabilities
```

**If npm install fails:**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Start the Application

```bash
npm run dev

# Expected output:
#   VITE v6.x.x  ready in XXX ms
#
#   ➜  Local:   http://localhost:9040/
#   ➜  Network: http://xxx.xxx.xxx.xxx:9040/
```

---

## Verify Installation

### Check in Browser

1. Open your web browser
2. Navigate to: `http://localhost:9040`
3. You should see the NetViz Pro interface
4. Upload a topology JSON file to test

### Verify from Command Line

```bash
# Check if the app is listening on port 9040
curl -s http://localhost:9040 | head -5

# Should return HTML content starting with <!DOCTYPE html>
```

---

## Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```

### Production Build
```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

### Run in Background (Linux/macOS)
```bash
# Start in background
nohup npm run dev > /tmp/netviz.log 2>&1 &

# Check if running
lsof -i:9040

# View logs
tail -f /tmp/netviz.log

# Stop the app
lsof -ti:9040 | xargs kill -9
```

---

## Accessing from Other Machines

The application binds to `0.0.0.0:9040` by default, making it accessible from any machine on the network.

### Find Your Server's IP Address

```bash
# Linux
hostname -I | awk '{print $1}'

# macOS
ipconfig getifaddr en0
```

### Access URL Format
```
http://<server-ip>:9040
```

### Example
If your server IP is `172.16.39.173`:
```
http://172.16.39.173:9040
```

### Firewall Configuration (if needed)

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 9040/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --add-port=9040/tcp --permanent
sudo firewall-cmd --reload
```

---

## Troubleshooting

### Issue: Port 9040 already in use

```bash
# Find and kill the process
lsof -ti:9040 | xargs kill -9

# Or use a different port
npm run dev -- --port 9041
```

### Issue: npm install fails with permission errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm install
```

### Issue: "command not found: node"

```bash
# Check if Node.js is in PATH
which node

# If not found, add to PATH (Linux)
export PATH=$PATH:/usr/local/bin

# Make permanent by adding to ~/.bashrc
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### Issue: App shows blank screen

1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Ensure you've uploaded a valid JSON topology file
4. Clear browser cache and reload

### Issue: Cannot connect from remote machine

1. Check firewall settings
2. Verify the server IP address
3. Ensure the app is running: `lsof -i:9040`
4. Test with curl from the remote machine: `curl http://<server-ip>:9040`

---

## Uninstall

### Remove the Application

```bash
# Stop the app first
lsof -ti:9040 | xargs kill -9 2>/dev/null

# Remove the directory
cd ~
rm -rf OSPF2-LL-JSON
```

### Clean npm Cache (Optional)

```bash
npm cache clean --force
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Clone repo | `git clone https://github.com/zumanm1/OSPF2-LL-JSON.git` |
| Install deps | `cd OSPF2-LL-JSON/netviz-pro && npm install` |
| Start app | `npm run dev` |
| Build prod | `npm run build` |
| Stop app | `lsof -ti:9040 \| xargs kill -9` |
| Check status | `lsof -i:9040` |
| View logs | `tail -f /tmp/netviz.log` |

---

## Support

- **GitHub Issues**: https://github.com/zumanm1/OSPF2-LL-JSON/issues
- **Documentation**: See README.md and docs/ folder
