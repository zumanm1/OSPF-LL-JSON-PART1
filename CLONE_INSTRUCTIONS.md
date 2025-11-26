# NetViz Pro - Clone & Setup Instructions

## GitHub Repository
**URL**: https://github.com/zumanm1/OSPF2-LL-JSON

---

## Quick Clone (One Command)

```bash
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && cd OSPF2-LL-JSON/netviz-pro && npm install && npm run dev
```

---

## Step-by-Step Clone Instructions

### Step 1: Prerequisites

Before cloning, ensure you have:

| Software | Version | Check Command |
|----------|---------|---------------|
| Git | 2.0+ | `git --version` |
| Node.js | 18.0+ | `node --version` |
| npm | 9.0+ | `npm --version` |

#### Install Prerequisites (if needed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**CentOS/RHEL:**
```bash
sudo yum install -y git curl
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**macOS:**
```bash
brew install git node@20
```

---

### Step 2: Clone the Repository

```bash
# Navigate to your preferred directory
cd ~

# Clone the repository
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git
```

**Expected Output:**
```
Cloning into 'OSPF2-LL-JSON'...
remote: Enumerating objects: XXX, done.
remote: Counting objects: 100% (XXX/XXX), done.
remote: Compressing objects: 100% (XXX/XXX), done.
Receiving objects: 100% (XXX/XXX), X.XX MiB | X.XX MiB/s, done.
Resolving deltas: 100% (XXX/XXX), done.
```

---

### Step 3: Navigate to Project

```bash
cd OSPF2-LL-JSON/netviz-pro
```

**Verify directory contents:**
```bash
ls -la
```

**Expected files:**
```
App.tsx
package.json
components/
utils/
types.ts
constants.ts
vite.config.ts
README.md
INSTALL.md
```

---

### Step 4: Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 196 packages, and audited 197 packages in Xm

16 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

---

### Step 5: Start the Application

```bash
npm run dev
```

**Expected Output:**
```
  VITE v6.4.1  ready in XXX ms

  ➜  Local:   http://localhost:9040/
  ➜  Network: http://xxx.xxx.xxx.xxx:9040/
```

---

### Step 6: Access the Application

Open your browser and navigate to:

- **Local access**: http://localhost:9040
- **Network access**: http://YOUR_IP:9040

---

## Complete Script for Fresh Machine

Copy and run this entire script on a fresh machine:

```bash
#!/bin/bash
# NetViz Pro - Complete Setup Script

echo "=== NetViz Pro Setup ==="

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "ERROR: git not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "ERROR: node not installed"
    exit 1
fi

echo "Git: $(git --version)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo ""

# Clone
echo "Cloning repository..."
cd ~
rm -rf OSPF2-LL-JSON 2>/dev/null
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git

# Install
echo "Installing dependencies..."
cd OSPF2-LL-JSON/netviz-pro
npm install

# Run
echo "Starting application..."
npm run dev
```

Save as `setup_netviz.sh` and run:
```bash
chmod +x setup_netviz.sh
./setup_netviz.sh
```

---

## Running in Background (Server Mode)

To run the app in the background:

```bash
cd ~/OSPF2-LL-JSON/netviz-pro

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

## Firewall Configuration (if needed)

If accessing from another machine, open port 9040:

**Ubuntu/Debian (ufw):**
```bash
sudo ufw allow 9040/tcp comment "NetViz Pro"
sudo ufw reload
```

**CentOS/RHEL (firewalld):**
```bash
sudo firewall-cmd --add-port=9040/tcp --permanent
sudo firewall-cmd --reload
```

---

## Updating to Latest Version

```bash
cd ~/OSPF2-LL-JSON
git pull origin main
cd netviz-pro
npm install
npm run dev
```

---

## Troubleshooting

### Clone fails with permission denied
```bash
# Use HTTPS instead of SSH
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git
```

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port 9040 already in use
```bash
lsof -ti:9040 | xargs kill -9
npm run dev
```

### Cannot access from other machine
1. Check firewall: `sudo ufw status`
2. Add rule: `sudo ufw allow 9040/tcp`
3. Verify app is running: `lsof -i:9040`

---

## Quick Reference

| Action | Command |
|--------|---------|
| Clone | `git clone https://github.com/zumanm1/OSPF2-LL-JSON.git` |
| Install | `cd OSPF2-LL-JSON/netviz-pro && npm install` |
| Run | `npm run dev` |
| Background | `nohup npm run dev > /tmp/netviz.log 2>&1 &` |
| Stop | `lsof -ti:9040 \| xargs kill -9` |
| Update | `git pull origin main && npm install` |
| Logs | `tail -f /tmp/netviz.log` |

---

## Support

- **GitHub**: https://github.com/zumanm1/OSPF2-LL-JSON
- **Issues**: https://github.com/zumanm1/OSPF2-LL-JSON/issues
