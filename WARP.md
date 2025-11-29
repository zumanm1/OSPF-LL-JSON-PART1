# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

NetViz Pro is a network visualization and analysis tool for OSPF topology management. It provides 8+ specialized analysis pages for network engineers to monitor, optimize, and simulate OSPF networks with interactive D3 visualizations.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark/light theme support)
- **Visualization**: D3.js
- **Backend**: Express.js (Node.js)
- **Database**: SQLite (user auth)
- **Auth**: JWT + bcryptjs
- **Testing**: Puppeteer (browser automation)
- **Server Port Mapping**: Gateway (9040) → Auth API (9041) + Vite (9042)

## Build & Development Commands

### Full Stack Setup
```bash
npm install                    # Install all dependencies
npm run dev:full              # Start gateway (9040) + auth server (9041) + Vite (9042)
npm run dev                   # Start Vite dev server only (9042)
npm run server                # Start auth server only (9041)
npm run build                 # Build for production
```

### Utility Scripts (from netviz-pro/)
```bash
./prep.sh                     # Full automated setup (clone, install, reset DB)
./run.sh                      # Start all services + validate
./start.sh                    # Start all services in background
./stop.sh                     # Stop all services
./restart.sh                  # Restart all services
./clean-db.sh                 # Reset database to default admin/admin123
./install.sh [--with-deps]    # Complete installation with optional dependency setup
./check.sh                    # Validate prerequisites
```

### Testing & Validation
```bash
node comprehensive_test.cjs              # Run full app test suite (theme, modals, data flow)
node test_all_8_pages.cjs                # Test all 8 analysis pages with Puppeteer
node validate_all_pages.cjs              # Deep validation of UI components
node validate_network_topology.js        # Validate topology JSON format
```

## Project Structure

### Root Level
- `netviz-pro/` - Main application directory
- `*.md` - Documentation (CLONE_INSTRUCTIONS, IMPLEMENTATION_REPORT, PATH_ANIMATION_GUIDE, etc.)
- Python validation scripts (validate_topology.py, validate_colors.py, etc.) for offline topology checks
- Sample topology JSONs for testing

### netviz-pro/
- **server/** - Express backend (auth API, user DB, gateway proxy)
- **index.tsx, App.tsx** - React app entry points
- **components/** - React UI components
- **hooks/** - Custom React hooks
- **utils/** - Utility functions (D3 graph logic, data transformations)
- **types.ts** - TypeScript interfaces for nodes, links, topology
- **constants.ts** - App configuration (colors, sizes, defaults)
- **vite.config.ts** - Vite build configuration
- **tsconfig.json** - TypeScript configuration
- **package.json** - Dependencies and npm scripts

## Architecture Overview

### Three-Server Architecture (Security Model)

```
User Browser
    ↓
Port 9040 (Gateway - Express Proxy)
    ├─ Blocks ALL access without login
    ├─ Server-side authentication check
    └─→ Routes to Port 9042 (Vite) if authenticated
         ↑
         └─ Proxied through gateway (never direct access)

Port 9041 (Auth API - Express)
    └─ Localhost only (127.0.0.1)
    └─ Handles JWT + bcrypt auth
    └─ User database (SQLite)

Port 9042 (Vite Dev Server)
    └─ Internal only (proxied via 9040)
    └─ React app with D3 visualizations
```

**Security**: Gateway enforces server-side authentication. Unauthenticated users never reach the app.

### Data Flow

1. User uploads topology JSON (nodes + links)
2. App stores in localStorage (`netviz_original_data`)
3. D3 renders interactive force graph
4. 8+ analysis modals compute on-demand:
   - Transit Country Analyzer (criticality scoring)
   - What-If Scenario Planner (link cost modification)
   - Full Cost Matrix Dashboard (country-pair routing costs)
   - Dijkstra Algorithm Visualizer (shortest path animation)
   - Traffic Flow Analyzer (traffic matrix with SPOF detection)
   - OSPF Cost Optimizer (goal-based routing optimization)
   - Ripple Effect Analyzer (multi-level impact simulation)
   - Network Health Dashboard (bottleneck detection, health scores)

### Key Components

- **App.tsx** - Main app shell, theme toggle, modal routing
- **Topology Graph (D3)** - Force-directed graph visualization with node/link interactions
- **Modal System** - 8 specialized analysis pages in fixed overlays
- **Theme System** - Dark/light mode with localStorage persistence
- **Auth Gateway** - Server-side proxy protecting all routes

## Development Notes

### Testing Strategy

Use Puppeteer scripts to validate:
- Theme persistence (localStorage)
- Modal functionality (all 8 pages)
- Topology rendering (node/link counts vs input JSON)
- Data flow (upload → render → analysis)
- No JavaScript errors in console

**Run tests against running app**: `npm run dev:full` (in one terminal), then run test scripts in another.

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Grace period**: 10 logins before forced password change

### Topology JSON Format

Nodes require: `id`, `name`, `country`, `lat`, `lng`
Links require: `source`, `target`, `cost`

Optional link fields: `is_asymmetric`, `status` (down/up)

See sample JSONs in repo root for reference.

### Port Management

If ports are in use:
```bash
lsof -ti:9040,9041,9042 | xargs kill -9
```

### Environment Variables

Copy `.env.temp` to `.env.local`:
```bash
APP_SECRET_KEY=<32-char hex from: openssl rand -hex 32>
APP_SESSION_TIMEOUT=3600
APP_DEFAULT_MAX_USES=10
```

## Key Files for Navigation

- `CLONE_INSTRUCTIONS.md` - Full setup guide with prerequisites
- `netviz-pro/package.json` - All npm scripts and dependencies
- `netviz-pro/vite.config.ts` - Build and dev server config (ports)
- `netviz-pro/tsconfig.json` - TypeScript compiler options
- `netviz-pro/comprehensive_test.cjs` - Reference for testing approach
