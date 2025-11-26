# NetViz Pro - Clone & Setup Instructions (Ubuntu 24.04)

## GitHub Repository
**URL**: https://github.com/zumanm1/OSPF2-LL-JSON

---

## Quick Clone (One Command)

```bash
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && cd OSPF2-LL-JSON/netviz-pro && npm install && npm run dev
```

---

## Step-by-Step Instructions (Ubuntu 24.04)

### Step 1: Install Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install git and curl
sudo apt install -y git curl

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
git --version      # Should show: git version 2.x.x
node --version     # Should show: v20.x.x
npm --version      # Should show: 10.x.x
```

---

### Step 2: Clone the Repository

```bash
cd ~
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git
```

---

### Step 3: Navigate to Project

```bash
cd OSPF2-LL-JSON/netviz-pro
```

---

### Step 4: Install Dependencies

```bash
npm install
```

---

### Step 5: Start the Application

```bash
npm run dev
```

**Access the app at:** http://localhost:9040

---

## Run in Background (Server Mode)

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

## Firewall Configuration (Ubuntu 24.04)

```bash
# Allow port 9040
sudo ufw allow 9040/tcp comment "NetViz Pro"

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status | grep 9040
```

---

## Update to Latest Version

```bash
cd ~/OSPF2-LL-JSON
git pull origin main
cd netviz-pro
npm install
npm run dev
```

---

## Complete Setup Script (Ubuntu 24.04)

Save as `setup_netviz.sh`:

```bash
#!/bin/bash
# NetViz Pro - Ubuntu 24.04 Setup Script

set -e

echo "=== NetViz Pro Setup (Ubuntu 24.04) ==="

# Install prerequisites
echo "Installing prerequisites..."
sudo apt update
sudo apt install -y git curl

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Git: $(git --version)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Clone repository
echo "Cloning repository..."
cd ~
rm -rf OSPF2-LL-JSON 2>/dev/null
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git

# Install dependencies
echo "Installing dependencies..."
cd OSPF2-LL-JSON/netviz-pro
npm install

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 9040/tcp comment "NetViz Pro" 2>/dev/null || true

# Start application
echo "Starting application..."
npm run dev
```

Run the script:
```bash
chmod +x setup_netviz.sh
./setup_netviz.sh
```

---

## Troubleshooting (Ubuntu 24.04)

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
```bash
# Check firewall status
sudo ufw status

# Add port 9040
sudo ufw allow 9040/tcp

# Verify app is listening
lsof -i:9040
```

### Permission denied errors
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

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
| Firewall | `sudo ufw allow 9040/tcp` |
| Logs | `tail -f /tmp/netviz.log` |

---

## Access URLs

- **Local**: http://localhost:9040
- **Network**: http://YOUR_SERVER_IP:9040

---

## Support

- **GitHub**: https://github.com/zumanm1/OSPF2-LL-JSON
- **Issues**: https://github.com/zumanm1/OSPF2-LL-JSON/issues
