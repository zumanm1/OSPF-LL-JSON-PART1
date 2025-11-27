# NetViz Pro - Clone & Setup Instructions (Ubuntu 24.04)

## GitHub Repository
**URL**: https://github.com/zumanm1/OSPF2-LL-JSON

---

## Quick Start (One Command)

**Fresh Ubuntu/WSL (installs Node.js + everything):**
```bash
sudo apt update && sudo apt install -y git curl && curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs && git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && cd OSPF2-LL-JSON/netviz-pro && npm install && npm run dev:full
```

**If Node.js 20.x already installed:**
```bash
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git && cd OSPF2-LL-JSON/netviz-pro && npm install && npm run dev:full
```

**Default Login:** `admin` / `admin123`

---

## Architecture Overview

NetViz Pro has three components with **server-side authentication protection**:

| Component | Port | Access | Description |
|-----------|------|--------|-------------|
| Gateway Server | 9040 | Public | Auth gateway - blocks all access without login |
| Auth Server | 9041 | Localhost | Express API - User authentication |
| Vite Dev Server | 9042 | Localhost | React UI (proxied through gateway) |

**Security Model:**
- Users access port 9040 (gateway)
- Gateway shows login page until authenticated
- After login, gateway proxies to Vite (9042)
- Auth API (9041) is localhost-only
- **No content is served without authentication**

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

### Step 5: Configure Environment (Optional)

Copy the template and customize:

```bash
cp .env.temp .env.local
```

Edit `.env.local` to change:
- `APP_SECRET_KEY` - JWT secret (generate with `openssl rand -hex 32`)
- `APP_SESSION_TIMEOUT` - Session duration in seconds (default: 3600)
- `APP_DEFAULT_MAX_USES` - Default login limit for new users (default: 10)

---

### Step 6: Start the Application

**Option A: Start Both Servers (Recommended)**
```bash
npm run dev:full
```

**Option B: Start Separately**
```bash
# Terminal 1 - Auth Server (port 9041)
npm run server

# Terminal 2 - Frontend (port 9040)
npm run dev
```

---

### Step 7: Login

- **URL:** http://localhost:9040
- **Username:** `admin`
- **Password:** `admin123`

**Important:** Change the admin password after first login!

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start frontend only (port 9040) |
| `server` | `npm run server` | Start auth server only (port 9041) |
| `dev:full` | `npm run dev:full` | Start both servers |
| `build` | `npm run build` | Build for production |

---

## Run in Background (Server Mode)

```bash
cd ~/OSPF2-LL-JSON/netviz-pro

# Start auth server in background
nohup node server/index.js > /tmp/netviz-auth.log 2>&1 &

# Start frontend in background
nohup npm run dev > /tmp/netviz-frontend.log 2>&1 &

# Check if running
lsof -i:9040
lsof -i:9041

# View logs
tail -f /tmp/netviz-auth.log
tail -f /tmp/netviz-frontend.log

# Stop both
lsof -ti:9040 | xargs kill -9 2>/dev/null
lsof -ti:9041 | xargs kill -9 2>/dev/null
```

---

## Firewall Configuration (Ubuntu 24.04)

```bash
# Allow frontend port
sudo ufw allow 9040/tcp comment "NetViz Pro Frontend"

# Auth server runs on localhost only - no firewall rule needed

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status | grep 9040
```

---

## Security Features

| Feature | Description |
|---------|-------------|
| **Server-Side Auth** | Gateway blocks ALL content until login (not just client-side) |
| Localhost Auth | Auth API only accessible from 127.0.0.1 |
| Password Hashing | bcrypt with salt rounds |
| JWT Tokens | Session-based authentication with cookies |
| Usage Limits | Configurable login limits per user |
| Admin Panel | User management (admin only) |
| Protected Proxy | Vite server only accessible via authenticated gateway |

---

## User Management (Admin Only)

After logging in as admin:
1. Click on username in top-right
2. Select "Admin Panel"
3. Features available:
   - Create new users
   - Reset passwords
   - Reset usage counters
   - Enable/disable expiry
   - Delete users

---

## Update to Latest Version

```bash
cd ~/OSPF2-LL-JSON

# Stop running servers
lsof -ti:9040 | xargs kill -9 2>/dev/null
lsof -ti:9041 | xargs kill -9 2>/dev/null

# Pull latest
git pull origin main

# Reinstall dependencies
cd netviz-pro
npm install

# Start
npm run dev:full
```

---

## Complete Setup Script (Ubuntu 24.04)

Save as `setup_netviz.sh`:

```bash
#!/bin/bash
# NetViz Pro - Ubuntu 24.04 Setup Script

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           NetViz Pro Setup (Ubuntu 24.04)                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Install prerequisites
echo "[1/6] Installing prerequisites..."
sudo apt update
sudo apt install -y git curl

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "[2/6] Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "[2/6] Node.js already installed"
fi

echo "  Git: $(git --version)"
echo "  Node: $(node --version)"
echo "  NPM: $(npm --version)"

# Clone repository
echo "[3/6] Cloning repository..."
cd ~
rm -rf OSPF2-LL-JSON 2>/dev/null || true
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git

# Install dependencies
echo "[4/6] Installing dependencies..."
cd OSPF2-LL-JSON/netviz-pro
npm install

# Configure firewall
echo "[5/6] Configuring firewall..."
sudo ufw allow 9040/tcp comment "NetViz Pro Frontend" 2>/dev/null || true

# Start application
echo "[6/6] Starting application..."
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Starting NetViz Pro...                                      ║"
echo "║  Frontend: http://localhost:9040                             ║"
echo "║  Auth API: http://127.0.0.1:9041 (localhost only)            ║"
echo "║                                                              ║"
echo "║  Default Login: admin / admin123                             ║"
echo "║  (Change password after first login!)                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

npm run dev:full
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

### Port already in use
```bash
# Kill processes on both ports
lsof -ti:9040 | xargs kill -9 2>/dev/null
lsof -ti:9041 | xargs kill -9 2>/dev/null
npm run dev:full
```

### Cannot access from other machine
```bash
# Check firewall status
sudo ufw status

# Add port 9040 (frontend)
sudo ufw allow 9040/tcp

# Verify app is listening
lsof -i:9040
```

### Auth server not starting
```bash
# Check if port 9041 is in use
lsof -i:9041

# Start auth server manually to see errors
node server/index.js
```

### Login fails with "Auth server not available"
```bash
# Ensure auth server is running
curl http://127.0.0.1:9041/api/health

# If not running, start it
node server/index.js &
```

### Permission denied errors
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### Database reset (clear all users)
```bash
rm -f server/users.db
# Restart auth server - default admin will be recreated
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Clone | `git clone https://github.com/zumanm1/OSPF2-LL-JSON.git` |
| Install | `cd OSPF2-LL-JSON/netviz-pro && npm install` |
| Run Both | `npm run dev:full` |
| Run Frontend | `npm run dev` |
| Run Auth | `npm run server` |
| Background | `nohup npm run dev:full > /tmp/netviz.log 2>&1 &` |
| Stop | `lsof -ti:9040,9041 \| xargs kill -9` |
| Update | `git pull origin main && npm install` |
| Firewall | `sudo ufw allow 9040/tcp` |
| Health Check | `curl http://127.0.0.1:9041/api/health` |

---

## Access URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (Local) | http://localhost:9040 | Main application |
| Frontend (Network) | http://YOUR_IP:9040 | Requires firewall rule |
| Auth API | http://127.0.0.1:9041/api | Localhost only |
| Health Check | http://127.0.0.1:9041/api/health | Server status |

---

## Default Credentials

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| admin | admin123 | Administrator | Change after first login! |

---

## Support

- **GitHub**: https://github.com/zumanm1/OSPF2-LL-JSON
- **Issues**: https://github.com/zumanm1/OSPF2-LL-JSON/issues
