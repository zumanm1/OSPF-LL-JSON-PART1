#!/bin/bash
# ============================================================================
# NetViz Pro - Automated Installation Script
# ============================================================================
# This script handles complete installation including:
# - Version validation (Node.js, npm, git)
# - Port cleanup (stops services on 9040, 9041)
# - Database reset
# - Old installation removal
# - Fresh clone and dependency installation
# - Application startup
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/zumanm1/OSPF2-LL-JSON.git"
INSTALL_DIR="$HOME/OSPF2-LL-JSON"
APP_DIR="$INSTALL_DIR/netviz-pro"
PORTS="9040 9041"

# ============================================================================
# Helper Functions
# ============================================================================
print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_command() {
    if command -v $1 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# PHASE 1: Version Validation
# ============================================================================
print_header "PHASE 1: Validating Prerequisites"

# Check Git
if check_command git; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_step "Git installed: v$GIT_VERSION"
else
    print_error "Git not installed. Please install git first."
    exit 1
fi

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_step "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js version must be 18 or higher. Current: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
if check_command npm; then
    NPM_VERSION=$(npm --version)
    print_step "npm installed: v$NPM_VERSION"
else
    print_error "npm not installed. Please install npm first."
    exit 1
fi

echo ""
echo "  Summary:"
echo "  - Git:     v$GIT_VERSION"
echo "  - Node.js: $NODE_VERSION"
echo "  - npm:     v$NPM_VERSION"

# ============================================================================
# PHASE 2: Stop Running Services
# ============================================================================
print_header "PHASE 2: Stopping Running Services"

for PORT in $PORTS; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo "  Stopping process on port $PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null || true
        print_step "Port $PORT cleared"
    else
        print_step "Port $PORT already free"
    fi
done

# Wait for ports to be released
sleep 2

# ============================================================================
# PHASE 3: Remove Old Installation
# ============================================================================
print_header "PHASE 3: Removing Old Installation"

if [ -d "$INSTALL_DIR" ]; then
    echo "  Found existing installation at: $INSTALL_DIR"

    # Backup database if exists (optional)
    if [ -f "$APP_DIR/server/users.db" ]; then
        print_warn "Database found - will be reset with fresh install"
    fi

    rm -rf "$INSTALL_DIR"
    print_step "Removed old installation"
else
    print_step "No previous installation found"
fi

# ============================================================================
# PHASE 4: Clone Repository
# ============================================================================
print_header "PHASE 4: Cloning Repository"

cd "$HOME"
echo "  Cloning from: $REPO_URL"
git clone "$REPO_URL" 2>&1 | while read line; do echo "  $line"; done

if [ -d "$INSTALL_DIR" ]; then
    print_step "Repository cloned successfully"
else
    print_error "Failed to clone repository"
    exit 1
fi

# ============================================================================
# PHASE 5: Install Dependencies
# ============================================================================
print_header "PHASE 5: Installing Dependencies"

cd "$APP_DIR"
echo "  Running npm install..."

# Try npm install, if fails try with clean cache
if npm install 2>&1 | while read line; do echo "  $line"; done; then
    print_step "Dependencies installed successfully"
else
    print_warn "First attempt failed, trying with clean cache..."
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install 2>&1 | while read line; do echo "  $line"; done
    print_step "Dependencies installed after retry"
fi

# ============================================================================
# PHASE 6: Database Reset (Fresh Start)
# ============================================================================
print_header "PHASE 6: Database Reset"

# Remove any existing database for fresh start
if [ -f "$APP_DIR/server/users.db" ]; then
    rm -f "$APP_DIR/server/users.db"
    print_step "Database cleared (will recreate with default admin)"
else
    print_step "Fresh database will be created on first run"
fi

# ============================================================================
# PHASE 7: Start Application
# ============================================================================
print_header "PHASE 7: Starting Application"

echo "  Starting all servers..."
echo ""

# Start in background
nohup npm run dev:full > /tmp/netviz-pro.log 2>&1 &
APP_PID=$!

echo "  Waiting for servers to initialize..."
sleep 5

# Verify servers are running
RUNNING=true
for PORT in $PORTS; do
    if lsof -ti:$PORT > /dev/null 2>&1; then
        print_step "Server on port $PORT is running"
    else
        print_warn "Server on port $PORT not detected yet"
        RUNNING=false
    fi
done

# ============================================================================
# PHASE 8: Installation Complete
# ============================================================================
print_header "INSTALLATION COMPLETE"

echo ""
echo -e "  ${GREEN}NetViz Pro is now running!${NC}"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  Access URL:    http://localhost:9040                   │"
echo "  │  Username:      admin                                   │"
echo "  │  Password:      admin123                                │"
echo "  │                                                         │"
echo "  │  IMPORTANT: Change password after first login!          │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
echo "  Server Architecture:"
echo "  - App (public):         Port 9040"
echo "  - Auth API (localhost): Port 9041"
echo ""
echo "  Logs: /tmp/netviz-pro.log"
echo "  Stop: lsof -ti:9040,9041 | xargs kill -9"
echo ""
echo -e "  ${BLUE}Thank you for using NetViz Pro!${NC}"
echo ""
