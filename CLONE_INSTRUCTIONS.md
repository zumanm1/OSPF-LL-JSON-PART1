# NetViz Pro - Clone & Setup Instructions (Ubuntu 24.04/WSL)

## GitHub Repository
**URL**: https://github.com/zumanm1/OSPF2-LL-JSON

---

## Quick Install (2-Script Approach - Recommended)

**Assumes Node.js, npm, and git are already installed.**

### Step 1: Download and Run PREP Script
```bash
# Download prep.sh, make executable, and run
curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/prep.sh -o /tmp/prep.sh && chmod +x /tmp/prep.sh && /tmp/prep.sh
```

**PREP does:**
- Validates git, node, npm versions
- Stops services on ports 9040, 9041, 9042
- Removes old OSPF2-LL-JSON folder
- Clones fresh repository
- Resets database
- Runs npm install

### Step 2: Run & Validate
```bash
cd ~/OSPF2-LL-JSON/netviz-pro && ./run.sh
```

**RUN does:**
- Starts all 3 servers (Gateway, Auth, Vite)
- Validates all services are running
- Performs API health check
- Shows access credentials

---

## Alternative: Single Command Install

### Option A: One-Liner (Node.js Already Installed)
```bash
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null; rm -rf ~/OSPF2-LL-JSON && git clone https://github.com/zumanm1/OSPF2-LL-JSON.git ~/OSPF2-LL-JSON && cd ~/OSPF2-LL-JSON/netviz-pro && rm -f server/users.db && npm install && npm run dev:full
```

### Option B: One-Liner (Fresh System - Also Installs Node.js)
```bash
sudo apt update && sudo apt install -y git curl && curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs && lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null; rm -rf ~/OSPF2-LL-JSON && git clone https://github.com/zumanm1/OSPF2-LL-JSON.git ~/OSPF2-LL-JSON && cd ~/OSPF2-LL-JSON/netviz-pro && rm -f server/users.db && npm install && npm run dev:full
```

**Default Login:** `admin` / `admin123`

---

## Architecture Overview

NetViz Pro has three components with **server-side authentication protection**:

| Component | Port | Access | Description |
|-----------|------|--------|-------------|
| Gateway Server | 9040 | Public | Auth gateway - blocks ALL access without login |
| Auth Server | 9041 | Localhost | Express API - User authentication |
| Vite Dev Server | 9042 | Localhost | React UI (proxied through gateway only) |

**Security Model:**
```
User Request → Port 9040 (Gateway)
                    ↓
            Not logged in? → Server-side login page (no app content)
                    ↓
            Valid login? → Sets cookie + localStorage
                    ↓
            Authenticated → Proxy to Vite (9042) → Full App Access
```

---

## Prerequisites Check

**Option 1: Run the automated check script**
```bash
curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/check.sh | bash
```

**Option 2: Manual verification**
Before installing, verify your system has these requirements:

```bash
# Check versions (run these commands)
git --version      # Required: 2.x.x or higher
node --version     # Required: v18.x.x or higher (v20.x recommended)
npm --version      # Required: 8.x.x or higher (10.x recommended)
```

### Install Prerequisites (if needed)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git and curl
sudo apt install -y git curl

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Manual Installation Steps

### Step 1: Stop Any Running Instances
```bash
# Stop processes on ports 9040, 9041, 9042
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null
echo "Ports cleared"
```

### Step 2: Remove Old Installation (if exists)
```bash
# Remove old installation and database
rm -rf ~/OSPF2-LL-JSON
echo "Old installation removed"
```

### Step 3: Clone Repository
```bash
cd ~
git clone https://github.com/zumanm1/OSPF2-LL-JSON.git
cd OSPF2-LL-JSON/netviz-pro
```

### Step 4: Reset Database (Fresh Start)
```bash
# Remove database for fresh admin credentials
rm -f server/users.db
echo "Database will be recreated with default admin"
```

### Step 5: Install Dependencies
```bash
npm install

# If npm install fails, try:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Step 6: Start Application
```bash
npm run dev:full
```

### Step 7: Access & Login
- **URL:** http://localhost:9040
- **Username:** `admin`
- **Password:** `admin123`

**IMPORTANT:** Change the admin password after first login!

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev:full` | `npm run dev:full` | Start all 3 servers (Gateway + Auth + Vite) |
| `server` | `npm run server` | Start auth server only (port 9041) |
| `gateway` | `npm run gateway` | Start gateway only (port 9040) |
| `dev` | `npm run dev` | Start Vite only (port 9042) |
| `build` | `npm run build` | Build for production |

---

## Utility Scripts

Pre-built bash scripts for common operations:

| Script | Description |
|--------|-------------|
| `./check.sh` | Validate prerequisites (git, node, npm, ports, disk) |
| `./prep.sh` | Full reinstall (stops, removes, clones, installs) |
| `./run.sh` | Start + validate all services |
| `./start.sh` | Start all servers in background |
| `./stop.sh` | Stop all running servers |
| `./restart.sh` | Stop and start all servers |
| `./clean-db.sh` | Reset database to fresh state (recreates default admin) |

### Usage Examples
```bash
cd ~/OSPF2-LL-JSON/netviz-pro

# Check prerequisites before install
./check.sh

# Start servers
./start.sh

# Stop servers
./stop.sh

# Restart servers
./restart.sh

# Reset database (clears all users, recreates admin/admin123)
./clean-db.sh
```

---

## Password Change Policy

The default admin account requires a password change:
- **Default:** admin/admin123
- **Grace Period:** 10 logins
- **After 10 logins:** Password change is FORCED (cannot access app until changed)

Users will see a warning banner showing remaining grace logins.

---

## Run in Background (Server Mode)

```bash
cd ~/OSPF2-LL-JSON/netviz-pro

# Start all servers in background
nohup npm run dev:full > /tmp/netviz-pro.log 2>&1 &

# Check if running
lsof -i:9040 && lsof -i:9041 && lsof -i:9042

# View logs
tail -f /tmp/netviz-pro.log

# Stop all servers
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null
```

---

## Environment Configuration (Optional)

```bash
# Copy template
cp .env.temp .env.local

# Generate secure secret key
openssl rand -hex 32
```

Edit `.env.local`:
| Variable | Default | Description |
|----------|---------|-------------|
| `APP_SECRET_KEY` | (random) | JWT signing secret |
| `APP_SESSION_TIMEOUT` | 3600 | Session duration in seconds |
| `APP_DEFAULT_MAX_USES` | 10 | Default login limit per user |

---

## Security Features

| Feature | Description |
|---------|-------------|
| **Server-Side Auth** | Gateway blocks ALL content until login (not just client-side) |
| **Localhost Auth API** | Auth API only accessible from 127.0.0.1 |
| **Protected Proxy** | Vite server only accessible via authenticated gateway |
| **Password Hashing** | bcrypt with salt rounds |
| **JWT Tokens** | Session-based authentication with cookies |
| **Usage Limits** | Configurable login limits per user |
| **Admin Panel** | User management (admin only) |

---

## Firewall Configuration

```bash
# Allow gateway port (public access)
sudo ufw allow 9040/tcp comment "NetViz Pro Gateway"

# Auth server and Vite are localhost-only - no firewall rule needed
sudo ufw reload

# Verify
sudo ufw status | grep 9040
```

---

## User Management (Admin Panel)

After logging in as admin:
1. Click username in top-right corner
2. Select "Admin Panel"
3. Available actions:
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
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null

# Pull latest code
git pull origin main

# Reinstall dependencies
cd netviz-pro
npm install

# Restart
npm run dev:full
```

---

## Fresh Reinstall (Complete Reset)

```bash
# Stop, remove, clone, install, start - all in one
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null; rm -rf ~/OSPF2-LL-JSON && git clone https://github.com/zumanm1/OSPF2-LL-JSON.git ~/OSPF2-LL-JSON && cd ~/OSPF2-LL-JSON/netviz-pro && rm -f server/users.db && npm install && npm run dev:full
```

---

## Troubleshooting

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
```bash
lsof -ti:9040,9041,9042 | xargs kill -9 2>/dev/null
npm run dev:full
```

### Cannot access from other machine
```bash
# Check firewall
sudo ufw status

# Allow port 9040
sudo ufw allow 9040/tcp
sudo ufw reload

# Verify servers are running
lsof -i:9040
```

### Login fails with "Auth server not available"
```bash
# Check auth server health
curl http://127.0.0.1:9041/api/health

# If not running, start manually
node server/index.js &
```

### Database reset (clear all users)
```bash
rm -f server/users.db
# Restart - default admin will be recreated
npm run dev:full
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
| Fresh Install | `curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/install.sh \| bash` |
| Clone | `git clone https://github.com/zumanm1/OSPF2-LL-JSON.git` |
| Install | `cd OSPF2-LL-JSON/netviz-pro && npm install` |
| Start All | `npm run dev:full` |
| Background | `nohup npm run dev:full > /tmp/netviz.log 2>&1 &` |
| Stop All | `lsof -ti:9040,9041,9042 \| xargs kill -9` |
| Update | `git pull origin main && npm install` |
| Reset DB | `rm -f server/users.db` |
| Health Check | `curl http://127.0.0.1:9041/api/health` |

---

## Access URLs

| Service | URL | Notes |
|---------|-----|-------|
| Application | http://localhost:9040 | Main entry point (gateway) |
| Network Access | http://YOUR_IP:9040 | Requires firewall rule |
| Auth API | http://127.0.0.1:9041/api | Localhost only |
| Health Check | http://127.0.0.1:9041/api/health | Server status |

---

## Default Credentials

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| admin | admin123 | Administrator | **Change after first login!** |

---

## Support

- **GitHub**: https://github.com/zumanm1/OSPF2-LL-JSON
- **Issues**: https://github.com/zumanm1/OSPF2-LL-JSON/issues
