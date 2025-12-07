# NetViz Pro

A comprehensive OSPF (Open Shortest Path First) network topology visualizer and analyzer with enterprise-grade authentication and 14 analysis modals.

## 🚀 Quick Start

### Option 1: Start with Auth-Vault (Recommended)

This is the recommended way to run NetViz Pro with full Keycloak + Vault integration:

```bash
# Clone the repository
git clone https://github.com/zumanm1/OSPF-LL-JSON-PART1.git
cd OSPF-LL-JSON-PART1/netviz-pro

# Install dependencies (first time only)
npm install --legacy-peer-deps

# Start with Auth-Vault (handles everything automatically)
./start-with-auth-vault.sh
```

This script will:
1. ✅ Check if auth-vault is installed (clone if missing)
2. ✅ Start Docker Desktop if not running
3. ✅ Start Keycloak and Vault containers
4. ✅ Wait for services to be healthy
5. ✅ Configure NetViz Pro environment
6. ✅ Start all NetViz Pro servers

**Access the app:** http://localhost:9040

### Option 2: Standard Start (Legacy Mode)

If you don't need Auth-Vault integration:

```bash
# Clone the repository
git clone https://github.com/zumanm1/OSPF-LL-JSON-PART1.git
cd OSPF-LL-JSON-PART1/netviz-pro

# First-time setup with nvm (recommended)
./netviz.sh setup     # Installs nvm + Node.js v20 (one-time)
./netviz.sh deps      # Install npm dependencies
./netviz.sh start     # Start servers
```

### Option 3: Manual Installation

```bash
# Install frontend dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your secure credentials

# Start development server
npm run dev           # Vite only (port 9042)
# OR for full stack with auth:
./start.sh            # All servers with authentication
```

**Access the app:** http://localhost:9040

**Default credentials:** See `.env.local` for admin username/password

### Verify Auth-Vault Integration

```bash
# Check if Auth-Vault is active
curl http://localhost:9041/api/health | jq .

# Expected response when Auth-Vault is active:
{
  "status": "ok",
  "authVault": "active",
  "authMode": "keycloak"
}
```

## 📜 Available Scripts

### Setup Commands

| Script | Description |
|--------|-------------|
| `./netviz.sh setup` | **First-time setup**: Install nvm + Node.js v20 (isolated environment) |
| `./netviz.sh install` | Check/install system requirements (Node.js, npm) |
| `./netviz.sh deps` | Check/install project dependencies (skips if already installed) |
| `./setup-nvm.sh` | Standalone nvm + Node.js environment setup script |

### Server Commands

| Script | Description |
|--------|-------------|
| `./start-with-auth-vault.sh` | **Recommended**: Start with Keycloak + Vault (handles everything) |
| `./netviz.sh start` | Start Gateway (9040), Auth (9041), and Vite (9042) servers |
| `./netviz.sh stop` | Stop all running servers |
| `./netviz.sh restart` | Restart all servers |
| `./netviz.sh status` | Show system and server status |
| `./netviz.sh logs` | View server logs (tail -f) |

### Build Commands

| Script | Description |
|--------|-------------|
| `./netviz.sh clean` | Clean build artifacts and node_modules |
| `./netviz.sh build` | Build for production |

### Individual Scripts

```bash
./setup-nvm.sh        # Setup nvm + Node.js (interactive)
./install.sh          # Install dependencies only
./start.sh            # Start all servers (foreground)
./stop.sh             # Stop all servers
./status.sh           # Check status
./restart.sh          # Restart servers
```

### Script Options

```bash
# Start on a custom port
./netviz.sh start -p 3000

# Force reinstall dependencies
./netviz.sh deps --force

# Using environment variable
NETVIZ_PORT=8080 ./netviz.sh start
```

## 🔐 Authentication System

NetViz Pro includes enterprise-grade authentication with **Auth-Vault integration**:

### Auth-Vault Integration (Keycloak + Vault)

| Component | Status | Port |
|-----------|--------|------|
| **Keycloak** | ✅ Integrated | 9120 |
| **Vault** | ✅ Integrated | 9121 |
| **Auth Mode** | `keycloak` or `legacy` | - |

**Quick Start with Auth-Vault:**

```bash
# 1. Start Auth-Vault services (Docker)
cd /Users/macbook/auth-vault
docker compose up -d

# 2. Start NetViz Pro
cd /Users/macbook/OSPF-LL-JSON-PART1/netviz-pro
./start.sh

# 3. Verify integration
curl http://localhost:9041/api/health | jq .
# Should show: "authVault": "active", "authMode": "keycloak"
```

See [README-AUTH-VAULT.md](../README-AUTH-VAULT.md) for detailed integration documentation.

### Security Features

- **JWT-based sessions** with secure cookies
- **Dual auth mode** - Keycloak SSO or legacy JWT
- **Rate limiting** on auth endpoints (5 attempts / 15 min)
- **Helmet security headers** (CSP, HSTS, X-Frame-Options)
- **Admin panel** for user management
- **Usage tracking** and expiry controls
- **CORS protection** with configurable origins

## 🛠️ System Requirements

- **Node.js** v18.0.0 - v24.x (v20 LTS recommended)
- **npm** v9.0.0+ (comes with Node.js)
- Modern browser (Chrome, Firefox, Safari, Edge)

## 🔒 Isolated Node.js Environment

This project uses **isolated Node.js/npm versions** to avoid conflicts with other projects on your machine.

### Quick Setup (Recommended)

```bash
# One command to install nvm + Node.js v20
./netviz.sh setup

# Or use the standalone script
./setup-nvm.sh
```

This will:
1. Install nvm (Node Version Manager) if not present
2. Install Node.js v20 LTS
3. Configure your shell for auto-switching
4. Display next steps

### Version Pinning Files

| File | Purpose | Tool Support |
|------|---------|--------------|
| `.nvmrc` | Pins Node v20 | nvm, fnm |
| `.node-version` | Pins Node v20 | fnm, volta, nodenv |
| `package.json` engines | Enforces Node 18-24, npm 9+ | npm |
| `package.json` packageManager | Pins npm@10.8.2 | corepack |

### Using nvm (Recommended)

```bash
# Option 1: Use our setup script (easiest)
./netviz.sh setup

# Option 2: Manual nvm installation
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
cd netviz-pro
nvm use          # Automatically uses Node v20 from .nvmrc

# Or manually:
nvm install 20
nvm use 20
```

### Using Volta (Alternative)

```bash
# Install Volta
curl https://get.volta.sh | bash

# Pin versions for this project
cd netviz-pro
volta pin node@20
volta pin npm@10
```

### Using fnm (Fast Alternative)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Use project version
cd netviz-pro
fnm use          # Reads .node-version
```

### Automatic Version Switching

All `./netviz.sh` commands automatically:
1. Detect if nvm is installed
2. Switch to the project's required Node version (v20)
3. Warn if using an incompatible version

```bash
./netviz.sh setup     # Install nvm + Node.js (first-time)
./netviz.sh install   # Shows isolation status and switches Node version
./netviz.sh start     # Auto-loads correct Node version before starting
./netviz.sh deps      # Auto-loads correct Node version before installing
```

### Shell Auto-Switching (Optional)

Add this to your `~/.zshrc` or `~/.bashrc` for automatic version switching when entering the project directory:

```bash
# Auto-switch Node version when entering directory with .nvmrc
autoload -U add-zsh-hook 2>/dev/null
load-nvmrc() {
  if [ -f .nvmrc ]; then
    nvm use 2>/dev/null
  fi
}
add-zsh-hook chpwd load-nvmrc 2>/dev/null
```

### Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

## 📊 Features (14 Analysis Modals)

| Modal | Description |
|-------|-------------|
| **Pair Countries** | Compare paths between country pairs |
| **Impact Analysis** | Analyze link change impact |
| **Transit Analyzer** | Identify transit countries |
| **What-If Scenario** | Simulate cost/status changes |
| **Full Cost Matrix** | View all country-pair costs |
| **Dijkstra Visualizer** | Step-by-step algorithm visualization |
| **Traffic Flow** | Link utilization analysis |
| **Cost Optimizer** | Optimization recommendations |
| **Ripple Effect** | Chain reaction analysis |
| **Network Health** | Health score and bottlenecks |
| **Capacity Planning** | Bandwidth planning |
| **Utilization Matrix** | Traffic utilization heatmap |
| **Pre/Post Traffic** | Before/after comparison |
| **Interface Dashboard** | Interface-level details |

## 🌐 Network Visualization Features

- **OSPF Cost Labels** on network links (toggle with button)
- **Asymmetric cost display** (forward↔reverse format)
- **Color-coded links** (blue=normal, amber=asymmetric, red=down)
- **Interactive D3.js graph** with zoom/pan
- **Path highlighting** with animated dashed lines
- **Country-based filtering** and high-level view

## 📤 Export Features

- **Export CSV** button on each modal
- **Export All** button in header - exports comprehensive analysis
- **Simulation export** for What-If scenarios

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Visualization | D3.js v7 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend | Express 5 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| Security | Helmet + Rate Limiting |

## 📁 Project Structure

```
netviz-pro/
├── netviz.sh               # Master control script
├── App.tsx                 # Main application
├── public/
│   └── favicon.svg         # Network topology favicon
├── components/             # React components (14 modals)
│   ├── NetworkGraph.tsx    # D3 visualization with OSPF costs
│   ├── LoginScreen.tsx     # Authentication UI
│   ├── AdminPanel.tsx      # User management
│   ├── *Modal.tsx          # Analysis modals
│   └── LinkDetailsPanel.tsx
├── server/                 # Backend
│   ├── gateway.js          # Security gateway (port 9040)
│   ├── index.js            # Auth API server (port 9041)
│   └── database.js         # SQLite operations
├── context/                # React contexts
│   ├── AuthContext.tsx     # Authentication state
│   └── ThemeContext.tsx    # Dark/Light theme
├── utils/                  # Utilities
│   ├── graphAlgorithms.ts  # Dijkstra, pathfinding
│   └── exportUtils.ts      # CSV export
├── types.ts                # TypeScript interfaces
└── .env.local              # Configuration (create from .env.local.example)
```

## 📋 Input File Format

Minimum required JSON structure:

```json
{
  "nodes": [
    {"id": "R1", "hostname": "router1.example.com", "country": "USA", "loopback_ip": "10.0.0.1"},
    {"id": "R2", "hostname": "router2.example.com", "country": "Germany", "loopback_ip": "10.0.0.2"}
  ],
  "links": [
    {
      "source": "R1",
      "target": "R2",
      "forward_cost": 10,
      "reverse_cost": 10,
      "status": "up"
    }
  ]
}
```

## 🚀 Running in Production

```bash
# Build for production
./netviz.sh build

# Or manually:
npm run build

# Preview production build
npm run preview

# Serve with any static server
npx serve dist
```

## 🌍 Running on Remote Server

```bash
# Start servers (binds to 0.0.0.0)
./netviz.sh start

# Access from any machine on the network:
# http://<server-ip>:9040
```

## 🔒 Network & IP Configuration

Configure in `.env.local`:

```bash
# Server Binding - Controls which interface the server listens on
# Options: 127.0.0.1 (localhost only), 0.0.0.0 (all interfaces), or specific IP
SERVER_HOST=0.0.0.0

# IP Whitelist - Comma-separated list of allowed client IPs
# Use 0.0.0.0 to allow all IPs (not recommended for production)
# Examples: 127.0.0.1,192.168.1.0/24,10.0.0.5
ALLOWED_IPS=0.0.0.0

# Localhost Only Mode (overrides SERVER_HOST if true)
LOCALHOST_ONLY=false
```

| Setting | Description |
|---------|-------------|
| `SERVER_HOST=0.0.0.0` | Listen on all network interfaces |
| `SERVER_HOST=127.0.0.1` | Listen only on localhost |
| `ALLOWED_IPS=0.0.0.0` | Allow connections from any IP |
| `ALLOWED_IPS=192.168.1.0/24` | Allow only local subnet |
| `LOCALHOST_ONLY=true` | Override to localhost only |

## 🔧 Troubleshooting

### Port already in use
```bash
./netviz.sh stop
# Or manually:
lsof -ti:9040 | xargs kill -9
```

### npm install fails
```bash
./netviz.sh clean
./netviz.sh deps --force
```

### Check server status
```bash
./netviz.sh status
```

### View logs
```bash
./netviz.sh logs
```

### App shows blank screen
- Check browser console for errors
- Ensure you've uploaded a valid JSON topology file
- Verify `.env.local` exists and is configured

## 📄 License

MIT
