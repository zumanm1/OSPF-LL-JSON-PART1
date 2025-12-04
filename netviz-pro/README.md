# NetViz Pro

A comprehensive OSPF (Open Shortest Path First) network topology visualizer and analyzer with enterprise-grade authentication and 14 analysis modals.

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-LL-JSON-PART1.git
cd OSPF-LL-JSON-PART1/netviz-pro
```

### 2. Using Bash Scripts (Recommended)

```bash
# One-liner to install and start
./netviz.sh install && ./netviz.sh deps && ./netviz.sh start

# Or step by step:
./netviz.sh install   # Check/install Node.js (skips if already installed)
./netviz.sh deps      # Check/install npm dependencies (skips if already installed)
./netviz.sh start     # Start servers (Gateway: 9040, Auth: 9041, Vite: 9042)
```

### 3. Manual Installation

```bash
# Install frontend dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your secure credentials

# Start development servers
npm run dev           # Vite only (port 9042)
# OR for full stack with auth:
./start.sh            # All servers with authentication
```

**Access the app:** http://localhost:9040

**Default credentials:** See `.env.local` for admin username/password

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `./netviz.sh install` | Check/install system requirements (skips if already met) |
| `./netviz.sh deps` | Check/install project dependencies (skips if already installed) |
| `./netviz.sh start` | Start Gateway (9040), Auth (9041), and Vite (9042) servers |
| `./netviz.sh stop` | Stop all running servers |
| `./netviz.sh restart` | Restart all servers |
| `./netviz.sh status` | Show system and server status |
| `./netviz.sh logs` | View server logs (tail -f) |
| `./netviz.sh clean` | Clean build artifacts and node_modules |
| `./netviz.sh build` | Build for production |

### Individual Scripts

```bash
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

NetViz Pro includes enterprise-grade authentication:

- **JWT-based sessions** with secure cookies
- **Rate limiting** on auth endpoints
- **Helmet security headers** (CSP, HSTS, X-Frame-Options)
- **Admin panel** for user management
- **Usage tracking** and expiry controls

## 🛠️ System Requirements

- **Node.js** v18.0.0+ (required)
- **npm** v9.0.0+ (comes with Node.js)
- Modern browser (Chrome, Firefox, Safari, Edge)

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
