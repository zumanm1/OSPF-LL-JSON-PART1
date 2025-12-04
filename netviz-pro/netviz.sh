#!/bin/bash

################################################################################
# NetViz Pro - Master Control Script
# OSPF Network Topology Visualizer with Enterprise Security
################################################################################

# Don't exit on error for status/stop commands
# set -e is applied selectively in commands that need it

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Default ports
GATEWAY_PORT=${NETVIZ_PORT:-9040}
AUTH_PORT=9041
VITE_PORT=9042

# PID directory
PID_DIR="$SCRIPT_DIR/.pids"
LOG_FILE="/tmp/netviz-pro.log"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     NetViz Pro - OSPF Network Topology Visualizer            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_port() {
    local PORT=$1
    if command -v lsof &> /dev/null; then
        lsof -ti:$PORT 2>/dev/null
    elif command -v fuser &> /dev/null; then
        fuser $PORT/tcp 2>/dev/null | awk '{print $1}'
    elif command -v ss &> /dev/null; then
        ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+'
    else
        echo ""
    fi
}

check_node() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    return 0
}

check_npm() {
    if ! command -v npm &> /dev/null; then
        return 1
    fi
    return 0
}

# ============================================================================
# Install Command - Install system requirements (skips if already met)
# ============================================================================
cmd_install() {
    print_header
    echo -e "${CYAN}Checking system requirements...${NC}"
    echo ""

    # Detect OS
    OS="unknown"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    elif [[ -f /etc/redhat-release ]]; then
        OS="redhat"
    fi

    echo -e "  Detected OS: ${GREEN}$OS${NC}"
    echo ""

    NEEDS_INSTALL=0

    # Check Node.js
    if check_node; then
        NODE_VERSION=$(node --version)
        echo -e "  ${GREEN}✓${NC} Node.js already installed: $NODE_VERSION (skipping)"
    else
        NEEDS_INSTALL=1
        echo -e "  ${YELLOW}⚠${NC} Node.js not found. Installing..."
        case $OS in
            macos)
                if command -v brew &> /dev/null; then
                    brew install node@20
                else
                    echo -e "  ${RED}✗${NC} Homebrew not found. Please install Node.js manually."
                    echo "     Visit: https://nodejs.org/"
                    exit 1
                fi
                ;;
            debian)
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
                ;;
            redhat)
                curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
                sudo yum install -y nodejs
                ;;
            *)
                echo -e "  ${RED}✗${NC} Unknown OS. Please install Node.js manually."
                echo "     Visit: https://nodejs.org/"
                exit 1
                ;;
        esac
        echo -e "  ${GREEN}✓${NC} Node.js installed: $(node --version)"
    fi

    # Check npm
    if check_npm; then
        NPM_VERSION=$(npm --version)
        echo -e "  ${GREEN}✓${NC} npm already installed: $NPM_VERSION (skipping)"
    else
        echo -e "  ${RED}✗${NC} npm not found. Please reinstall Node.js."
        exit 1
    fi

    echo ""
    if [ $NEEDS_INSTALL -eq 0 ]; then
        echo -e "${GREEN}✓ All system requirements already met! Nothing to install.${NC}"
    else
        echo -e "${GREEN}✓ System requirements installed!${NC}"
    fi
    echo ""
}

# ============================================================================
# Deps Command - Install project dependencies (skips if already installed)
# ============================================================================
cmd_deps() {
    print_header
    echo -e "${CYAN}Checking project dependencies...${NC}"
    echo ""

    # Check prerequisites
    if ! check_node || ! check_npm; then
        echo -e "${RED}✗ Node.js/npm not found. Run: ./netviz.sh install${NC}"
        exit 1
    fi

    INSTALLED_COUNT=0
    SKIPPED_COUNT=0

    # Force reinstall if --force flag
    if [[ "$1" == "--force" ]]; then
        echo -e "  ${YELLOW}Force reinstall requested - removing existing modules...${NC}"
        rm -rf node_modules package-lock.json server/node_modules 2>/dev/null || true
        echo ""
    fi

    # Check if frontend dependencies already installed
    if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
        # Verify key packages exist
        if [ -d "node_modules/react" ] && [ -d "node_modules/express" ]; then
            echo -e "  ${GREEN}✓${NC} Frontend dependencies already installed (skipping)"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        else
            echo -e "  ${YELLOW}⚠${NC} node_modules incomplete. Reinstalling..."
            npm install --legacy-peer-deps
            if [ $? -ne 0 ]; then
                echo -e "  ${RED}✗ Failed to install frontend dependencies${NC}"
                exit 1
            fi
            echo -e "  ${GREEN}✓${NC} Frontend dependencies installed"
            INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
        fi
    else
        echo -e "  Installing frontend dependencies..."
        npm install --legacy-peer-deps
        if [ $? -ne 0 ]; then
            echo -e "  ${RED}✗ Failed to install frontend dependencies${NC}"
            exit 1
        fi
        echo -e "  ${GREEN}✓${NC} Frontend dependencies installed"
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    fi

    # Check server dependencies if server/package.json exists
    if [ -f "server/package.json" ]; then
        if [ -d "server/node_modules" ]; then
            echo -e "  ${GREEN}✓${NC} Backend dependencies already installed (skipping)"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        else
            echo -e "  Installing backend dependencies..."
            cd server && npm install --legacy-peer-deps && cd ..
            if [ $? -ne 0 ]; then
                echo -e "  ${RED}✗ Failed to install backend dependencies${NC}"
                exit 1
            fi
            echo -e "  ${GREEN}✓${NC} Backend dependencies installed"
            INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
        fi
    fi

    # Check security packages (helmet, express-rate-limit)
    if [ -d "node_modules/helmet" ] && [ -d "node_modules/express-rate-limit" ]; then
        echo -e "  ${GREEN}✓${NC} Security packages already installed (skipping)"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    else
        echo -e "  Installing security packages..."
        npm install helmet express-rate-limit --legacy-peer-deps 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Security packages installed"
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    fi

    # Setup environment file
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.local.example" ]; then
            echo -e "  Creating .env.local from template..."
            cp .env.local.example .env.local
            echo -e "  ${YELLOW}⚠ IMPORTANT: Edit .env.local with your secure credentials!${NC}"
        fi
    else
        echo -e "  ${GREEN}✓${NC} .env.local exists"
    fi

    echo ""
    if [ $INSTALLED_COUNT -eq 0 ]; then
        echo -e "${GREEN}✓ All dependencies already installed! Nothing to do.${NC}"
    else
        echo -e "${GREEN}✓ Dependencies ready! (installed: $INSTALLED_COUNT, skipped: $SKIPPED_COUNT)${NC}"
    fi
    echo ""
}

# ============================================================================
# Start Command - Start all servers
# ============================================================================
cmd_start() {
    print_header
    echo -e "${CYAN}Starting NetViz Pro servers...${NC}"
    echo ""

    # Parse port option
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                GATEWAY_PORT="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    # Check if already running
    if [ -n "$(check_port $GATEWAY_PORT)" ]; then
        echo -e "  ${YELLOW}⚠${NC} Port $GATEWAY_PORT already in use"
        echo -e "  Run: ./netviz.sh stop"
        exit 1
    fi

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "  ${YELLOW}⚠${NC} Dependencies not installed. Running deps..."
        cmd_deps
    fi

    # Check .env.local
    if [ ! -f ".env.local" ]; then
        echo -e "  ${RED}✗${NC} .env.local not found!"
        echo -e "  Run: cp .env.local.example .env.local"
        exit 1
    fi

    # Create PID directory
    mkdir -p "$PID_DIR"

    # Start Auth Server
    echo -e "  Starting auth server (port $AUTH_PORT)..."
    node server/index.js >> "$LOG_FILE" 2>&1 &
    AUTH_PID=$!
    echo $AUTH_PID > "$PID_DIR/auth.pid"
    sleep 2

    if kill -0 $AUTH_PID 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Auth server started [PID: $AUTH_PID]"
    else
        echo -e "  ${RED}✗${NC} Auth server failed to start"
        cat "$LOG_FILE" | tail -10
        exit 1
    fi

    # Start Gateway Server
    echo -e "  Starting gateway server (port $GATEWAY_PORT)..."
    node server/gateway.js >> "$LOG_FILE" 2>&1 &
    GATEWAY_PID=$!
    echo $GATEWAY_PID > "$PID_DIR/gateway.pid"
    sleep 2

    if kill -0 $GATEWAY_PID 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Gateway server started [PID: $GATEWAY_PID]"
    else
        echo -e "  ${RED}✗${NC} Gateway server failed to start"
        exit 1
    fi

    # Start Vite Dev Server
    echo -e "  Starting Vite dev server (port $VITE_PORT)..."
    npx vite --host 127.0.0.1 --port $VITE_PORT --strictPort >> "$LOG_FILE" 2>&1 &
    VITE_PID=$!
    echo $VITE_PID > "$PID_DIR/vite.pid"
    sleep 3

    if kill -0 $VITE_PID 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Vite server started [PID: $VITE_PID]"
    else
        echo -e "  ${RED}✗${NC} Vite server failed to start"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  NetViz Pro is running!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Services:"
    echo "    • Gateway:     http://localhost:$GATEWAY_PORT  (👉 USE THIS)"
    echo "    • Auth API:    http://localhost:$AUTH_PORT     (internal)"
    echo "    • Vite Dev:    http://localhost:$VITE_PORT     (internal)"
    echo ""
    echo "  🔒 Security Features Active:"
    echo "    ✅ Helmet security headers (CSP, HSTS, X-Frame-Options)"
    echo "    ✅ Rate limiting on auth endpoints"
    echo "    ✅ JWT session management"
    echo ""
    echo "  Commands:"
    echo "    ./netviz.sh status  - Check status"
    echo "    ./netviz.sh stop    - Stop servers"
    echo "    ./netviz.sh logs    - View logs"
    echo ""
}

# ============================================================================
# Stop Command - Stop all servers
# ============================================================================
cmd_stop() {
    print_header
    echo -e "${CYAN}Stopping NetViz Pro servers...${NC}"
    echo ""

    STOPPED=0

    # Stop from PID files
    for SERVICE in auth gateway vite; do
        PID_FILE="$PID_DIR/$SERVICE.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 $PID 2>/dev/null; then
                kill $PID 2>/dev/null
                echo -e "  ${GREEN}✓${NC} $SERVICE stopped [PID: $PID]"
                STOPPED=$((STOPPED + 1))
            fi
            rm -f "$PID_FILE"
        fi
    done

    # Fallback: kill by port
    if [ $STOPPED -eq 0 ]; then
        echo -e "  ${YELLOW}No PID files found. Killing by port...${NC}"
        for PORT in $GATEWAY_PORT $AUTH_PORT $VITE_PORT; do
            PID=$(check_port $PORT)
            if [ -n "$PID" ]; then
                kill $PID 2>/dev/null
                echo -e "  ${GREEN}✓${NC} Killed process on port $PORT [PID: $PID]"
                STOPPED=$((STOPPED + 1))
            fi
        done
    fi

    # Clean up
    rm -rf "$PID_DIR" 2>/dev/null

    if [ $STOPPED -eq 0 ]; then
        echo -e "  ${YELLOW}No servers were running${NC}"
    else
        echo ""
        echo -e "${GREEN}✓ All servers stopped!${NC}"
    fi
    echo ""
}

# ============================================================================
# Restart Command
# ============================================================================
cmd_restart() {
    cmd_stop
    sleep 2
    cmd_start "$@"
}

# ============================================================================
# Status Command
# ============================================================================
cmd_status() {
    print_header
    echo -e "${CYAN}Service Status:${NC}"
    echo ""

    SERVICES_UP=0

    # Check Gateway
    PID=$(check_port $GATEWAY_PORT)
    if [ -n "$PID" ]; then
        echo -e "  ${GREEN}✓${NC} Gateway  ($GATEWAY_PORT):  RUNNING  [PID: $PID]"
        SERVICES_UP=$((SERVICES_UP + 1))
    else
        echo -e "  ${RED}✗${NC} Gateway  ($GATEWAY_PORT):  NOT RUNNING"
    fi

    # Check Auth
    PID=$(check_port $AUTH_PORT)
    if [ -n "$PID" ]; then
        echo -e "  ${GREEN}✓${NC} Auth API ($AUTH_PORT):  RUNNING  [PID: $PID]"
        SERVICES_UP=$((SERVICES_UP + 1))
    else
        echo -e "  ${RED}✗${NC} Auth API ($AUTH_PORT):  NOT RUNNING"
    fi

    # Check Vite
    PID=$(check_port $VITE_PORT)
    if [ -n "$PID" ]; then
        echo -e "  ${GREEN}✓${NC} Vite Dev ($VITE_PORT):  RUNNING  [PID: $PID]"
        SERVICES_UP=$((SERVICES_UP + 1))
    else
        echo -e "  ${RED}✗${NC} Vite Dev ($VITE_PORT):  NOT RUNNING"
    fi

    echo ""

    # Database status
    echo -e "${CYAN}Database:${NC}"
    echo ""
    if [ -f "server/users.db" ]; then
        DB_SIZE=$(ls -lh server/users.db 2>/dev/null | awk '{print $5}')
        echo -e "  ${GREEN}✓${NC} users.db: $DB_SIZE"
    else
        echo -e "  ${YELLOW}○${NC} users.db: Not created yet"
    fi

    echo ""

    # API Health check
    if [ $SERVICES_UP -ge 2 ] && command -v curl &> /dev/null; then
        echo -e "${CYAN}API Health:${NC}"
        echo ""
        HEALTH=$(curl -s -m 3 http://127.0.0.1:$AUTH_PORT/api/health 2>/dev/null || echo "FAILED")
        if echo "$HEALTH" | grep -q '"status":"ok"'; then
            echo -e "  ${GREEN}✓${NC} Auth API: OK"
        else
            echo -e "  ${RED}✗${NC} Auth API: Failed"
        fi
        echo ""
    fi

    # Summary
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    echo ""
    if [ $SERVICES_UP -eq 3 ]; then
        echo -e "  ${GREEN}All services running!${NC}"
        echo ""
        echo "  Access: http://localhost:$GATEWAY_PORT"
    else
        echo -e "  ${YELLOW}Status: $SERVICES_UP/3 services running${NC}"
        echo ""
        echo "  Start: ./netviz.sh start"
    fi
    echo ""
}

# ============================================================================
# Logs Command
# ============================================================================
cmd_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
    fi
}

# ============================================================================
# Clean Command
# ============================================================================
cmd_clean() {
    print_header
    echo -e "${CYAN}Cleaning build artifacts...${NC}"
    echo ""

    rm -rf node_modules 2>/dev/null && echo -e "  ${GREEN}✓${NC} Removed node_modules"
    rm -rf dist 2>/dev/null && echo -e "  ${GREEN}✓${NC} Removed dist"
    rm -rf .pids 2>/dev/null && echo -e "  ${GREEN}✓${NC} Removed .pids"
    rm -f package-lock.json 2>/dev/null && echo -e "  ${GREEN}✓${NC} Removed package-lock.json"

    echo ""
    echo -e "${GREEN}✓ Clean complete!${NC}"
    echo ""
}

# ============================================================================
# Build Command
# ============================================================================
cmd_build() {
    print_header
    echo -e "${CYAN}Building for production...${NC}"
    echo ""

    if [ ! -d "node_modules" ]; then
        echo -e "  ${YELLOW}⚠${NC} Dependencies not installed. Running deps..."
        cmd_deps
    fi

    npm run build
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Build complete! Output in ./dist${NC}"
        echo ""
    else
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    fi
}

# ============================================================================
# Help Command
# ============================================================================
cmd_help() {
    print_header
    echo "Usage: ./netviz.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  install     Install system requirements (Node.js, npm)"
    echo "  deps        Install project dependencies (frontend + backend)"
    echo "  start       Start all servers (Gateway: 9040, Auth: 9041, Vite: 9042)"
    echo "  stop        Stop all running servers"
    echo "  restart     Restart all servers"
    echo "  status      Show system and server status"
    echo "  logs        View server logs (tail -f)"
    echo "  clean       Clean build artifacts and node_modules"
    echo "  build       Build for production"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  start -p <port>    Start on custom gateway port"
    echo "  deps --force       Force reinstall dependencies"
    echo ""
    echo "Quick Start:"
    echo "  ./netviz.sh install && ./netviz.sh deps && ./netviz.sh start"
    echo ""
    echo "Environment Variables:"
    echo "  NETVIZ_PORT=8080 ./netviz.sh start    Start on custom port"
    echo ""
}

# ============================================================================
# Main
# ============================================================================
case "${1:-help}" in
    install)
        cmd_install
        ;;
    deps)
        cmd_deps "$2"
        ;;
    start)
        shift
        cmd_start "$@"
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        shift
        cmd_restart "$@"
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    clean)
        cmd_clean
        ;;
    build)
        cmd_build
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run: ./netviz.sh help"
        exit 1
        ;;
esac
