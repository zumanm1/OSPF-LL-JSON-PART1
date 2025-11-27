#!/bin/bash
# ============================================================================
# NetViz Pro - PREP Script (Step 1 of 2)
# ============================================================================
# Prepares the environment for NetViz Pro
# - Validates prerequisites (does NOT install npm/node if missing)
# - Stops running services
# - Clones repository
# - Installs dependencies
#
# Run ./run.sh after this to start the application
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/zumanm1/OSPF2-LL-JSON.git"
INSTALL_DIR="$HOME/OSPF2-LL-JSON"
APP_DIR="$INSTALL_DIR/netviz-pro"
MIN_NODE_VERSION=18

# Trap errors
trap 'echo -e "\n${RED}Error occurred at line $LINENO. Exiting.${NC}"; exit 1' ERR

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - PREP SCRIPT (Step 1 of 2)                   ║${NC}"
echo -e "${BLUE}║     Version: 2.0                                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Install Directory: ${CYAN}$INSTALL_DIR${NC}"
echo ""

# ============================================================================
# PHASE 1: Validate Prerequisites (NO AUTO-INSTALL)
# ============================================================================
echo -e "${YELLOW}[PHASE 1/6]${NC} Validating Prerequisites..."
echo ""

PREREQ_ERRORS=0

# Check Git
echo -n "  Checking git... "
if command -v git &> /dev/null; then
    GIT_VER=$(git --version | awk '{print $3}')
    echo -e "${GREEN}OK${NC} (v$GIT_VER)"
else
    echo -e "${RED}NOT FOUND${NC}"
    PREREQ_ERRORS=$((PREREQ_ERRORS + 1))
fi

# Check Node.js
echo -n "  Checking node... "
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    NODE_MAJOR=$(echo $NODE_VER | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge "$MIN_NODE_VERSION" ]; then
        echo -e "${GREEN}OK${NC} ($NODE_VER)"
    else
        echo -e "${RED}TOO OLD${NC} ($NODE_VER, need v$MIN_NODE_VERSION+)"
        PREREQ_ERRORS=$((PREREQ_ERRORS + 1))
    fi
else
    echo -e "${RED}NOT FOUND${NC}"
    PREREQ_ERRORS=$((PREREQ_ERRORS + 1))
fi

# Check npm
echo -n "  Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    echo -e "${GREEN}OK${NC} (v$NPM_VER)"
else
    echo -e "${RED}NOT FOUND${NC}"
    PREREQ_ERRORS=$((PREREQ_ERRORS + 1))
fi

# Check curl (optional but recommended)
echo -n "  Checking curl... "
if command -v curl &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}NOT FOUND${NC} (optional)"
fi

# Check lsof (needed for port management)
echo -n "  Checking lsof... "
if command -v lsof &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}NOT FOUND${NC} (will use alternatives)"
fi

echo ""

# Exit if prerequisites not met
if [ $PREREQ_ERRORS -gt 0 ]; then
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     PREREQUISITES NOT MET                                    ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Please install missing prerequisites:"
    echo ""
    echo "  For Ubuntu/Debian:"
    echo -e "  ${CYAN}sudo apt update && sudo apt install -y git curl${NC}"
    echo -e "  ${CYAN}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${NC}"
    echo -e "  ${CYAN}sudo apt install -y nodejs${NC}"
    echo ""
    echo "  Then run this script again."
    exit 1
fi

# ============================================================================
# PHASE 2: Stop Running Services
# ============================================================================
echo -e "${YELLOW}[PHASE 2/6]${NC} Stopping Running Services..."
echo ""

stop_port() {
    local PORT=$1
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti:$PORT 2>/dev/null || true)
    elif command -v fuser &> /dev/null; then
        PID=$(fuser $PORT/tcp 2>/dev/null | awk '{print $1}' || true)
    elif command -v ss &> /dev/null; then
        PID=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+' || true)
    else
        PID=""
    fi

    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Stopped process on port $PORT (PID: $PID)"
        return 0
    else
        echo -e "  ${GREEN}✓${NC} Port $PORT already free"
        return 0
    fi
}

for PORT in 9040 9041 9042; do
    stop_port $PORT
done

sleep 1
echo ""

# ============================================================================
# PHASE 3: Remove Old Installation
# ============================================================================
echo -e "${YELLOW}[PHASE 3/6]${NC} Removing Old Installation..."
echo ""

if [ -d "$INSTALL_DIR" ]; then
    # Backup check - warn if there might be custom data
    if [ -f "$INSTALL_DIR/netviz-pro/server/users.db" ]; then
        echo -e "  ${YELLOW}!${NC} Found existing database (users.db)"
    fi

    rm -rf "$INSTALL_DIR"
    echo -e "  ${GREEN}✓${NC} Removed: $INSTALL_DIR"
else
    echo -e "  ${GREEN}✓${NC} No previous installation found"
fi

echo ""

# ============================================================================
# PHASE 4: Clone Repository
# ============================================================================
echo -e "${YELLOW}[PHASE 4/6]${NC} Cloning Repository..."
echo ""

cd "$HOME"

# Clone with progress
if git clone --progress "$REPO_URL" 2>&1 | while read line; do
    echo "  $line"
done; then
    echo ""
    if [ -d "$INSTALL_DIR" ]; then
        echo -e "  ${GREEN}✓${NC} Repository cloned successfully"
    else
        echo -e "  ${RED}✗${NC} Clone appeared to succeed but directory not found"
        exit 1
    fi
else
    echo ""
    echo -e "  ${RED}✗${NC} Clone failed!"
    echo "  Check your internet connection and try again."
    exit 1
fi

echo ""

# ============================================================================
# PHASE 5: Install Dependencies
# ============================================================================
echo -e "${YELLOW}[PHASE 5/6]${NC} Installing Dependencies..."
echo ""

cd "$APP_DIR"

# Check if node_modules exists and is recent
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo -e "  ${YELLOW}!${NC} node_modules exists, running npm install anyway for fresh install"
fi

# Run npm install with retry logic
install_deps() {
    echo "  Running npm install..."
    if npm install 2>&1 | while read line; do
        echo "  $line"
    done; then
        return 0
    else
        return 1
    fi
}

if ! install_deps; then
    echo ""
    echo -e "  ${YELLOW}!${NC} First attempt failed, cleaning and retrying..."
    npm cache clean --force 2>/dev/null || true
    rm -rf node_modules package-lock.json 2>/dev/null || true

    if ! install_deps; then
        echo ""
        echo -e "  ${RED}✗${NC} npm install failed after retry"
        echo "  Try manually: cd $APP_DIR && npm install"
        exit 1
    fi
fi

echo ""
echo -e "  ${GREEN}✓${NC} Dependencies installed successfully"
echo ""

# ============================================================================
# PHASE 6: Set Permissions
# ============================================================================
echo -e "${YELLOW}[PHASE 6/6]${NC} Setting Permissions..."
echo ""

# Make all scripts executable
for SCRIPT in run.sh prep.sh start.sh stop.sh restart.sh clean-db.sh check.sh install.sh; do
    if [ -f "$APP_DIR/$SCRIPT" ]; then
        chmod +x "$APP_DIR/$SCRIPT"
        echo -e "  ${GREEN}✓${NC} $SCRIPT"
    fi
done

echo ""

# ============================================================================
# COMPLETE
# ============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ${GREEN}PREP COMPLETE${BLUE} - Ready to Run!                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Installation Summary:"
echo "  ├── Directory: $INSTALL_DIR"
echo "  ├── Node.js: $(node --version)"
echo "  └── npm: v$(npm --version)"
echo ""
echo -e "  ${CYAN}Next step: Start the application${NC}"
echo ""
echo -e "  ${GREEN}cd ~/OSPF2-LL-JSON/netviz-pro && ./run.sh${NC}"
echo ""
echo "  Or manually:"
echo "  cd ~/OSPF2-LL-JSON/netviz-pro && npm run dev:full"
echo ""
