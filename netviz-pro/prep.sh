#!/bin/bash
# ============================================================================
# NetViz Pro - PREP Script (Step 1 of 2)
# ============================================================================
# Run this FIRST to prepare the environment
# Then run ./run.sh to start and validate the application
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/zumanm1/OSPF2-LL-JSON.git"
INSTALL_DIR="$HOME/OSPF2-LL-JSON"
APP_DIR="$INSTALL_DIR/netviz-pro"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - PREP SCRIPT (Step 1 of 2)                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PHASE 1: Validate Prerequisites
# ============================================================================
echo -e "${YELLOW}[PHASE 1]${NC} Validating Prerequisites..."
echo ""

# Check Git
if command -v git &> /dev/null; then
    GIT_VER=$(git --version | awk '{print $3}')
    echo -e "  ${GREEN}✓${NC} Git:     v$GIT_VER"
else
    echo -e "  ${RED}✗${NC} Git not found!"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    NODE_MAJOR=$(echo $NODE_VER | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VER"
    else
        echo -e "  ${RED}✗${NC} Node.js $NODE_VER is too old (need v18+)"
        exit 1
    fi
else
    echo -e "  ${RED}✗${NC} Node.js not found!"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    echo -e "  ${GREEN}✓${NC} npm:     v$NPM_VER"
else
    echo -e "  ${RED}✗${NC} npm not found!"
    exit 1
fi

echo ""

# ============================================================================
# PHASE 2: Stop Running Services
# ============================================================================
echo -e "${YELLOW}[PHASE 2]${NC} Stopping Running Services..."
echo ""

for PORT in 9040 9041 9042; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Stopped process on port $PORT (PID: $PID)"
    else
        echo -e "  ${GREEN}✓${NC} Port $PORT already free"
    fi
done

sleep 1
echo ""

# ============================================================================
# PHASE 3: Remove Old Installation
# ============================================================================
echo -e "${YELLOW}[PHASE 3]${NC} Removing Old Installation..."
echo ""

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "  ${GREEN}✓${NC} Removed: $INSTALL_DIR"
else
    echo -e "  ${GREEN}✓${NC} No previous installation found"
fi

echo ""

# ============================================================================
# PHASE 4: Clone Repository
# ============================================================================
echo -e "${YELLOW}[PHASE 4]${NC} Cloning Repository..."
echo ""

cd "$HOME"
git clone "$REPO_URL" 2>&1 | sed 's/^/  /'

if [ -d "$INSTALL_DIR" ]; then
    echo ""
    echo -e "  ${GREEN}✓${NC} Repository cloned successfully"
else
    echo -e "  ${RED}✗${NC} Clone failed!"
    exit 1
fi

echo ""

# ============================================================================
# PHASE 5: Reset Database
# ============================================================================
echo -e "${YELLOW}[PHASE 5]${NC} Resetting Database..."
echo ""

if [ -f "$APP_DIR/server/users.db" ]; then
    rm -f "$APP_DIR/server/users.db"
    echo -e "  ${GREEN}✓${NC} Database removed (will recreate with default admin)"
else
    echo -e "  ${GREEN}✓${NC} Fresh database will be created"
fi

echo ""

# ============================================================================
# PHASE 6: Install Dependencies
# ============================================================================
echo -e "${YELLOW}[PHASE 6]${NC} Installing Dependencies..."
echo ""

cd "$APP_DIR"

# Run npm install
if npm install 2>&1 | sed 's/^/  /'; then
    echo ""
    echo -e "  ${GREEN}✓${NC} Dependencies installed successfully"
else
    echo ""
    echo -e "  ${YELLOW}!${NC} Retrying with clean cache..."
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install 2>&1 | sed 's/^/  /'
    echo ""
    echo -e "  ${GREEN}✓${NC} Dependencies installed after retry"
fi

echo ""

# ============================================================================
# PHASE 7: Make run.sh Executable
# ============================================================================
echo -e "${YELLOW}[PHASE 7]${NC} Setting Permissions..."
echo ""

chmod +x "$APP_DIR/run.sh" 2>/dev/null || true
chmod +x "$APP_DIR/prep.sh" 2>/dev/null || true
chmod +x "$APP_DIR/install.sh" 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} Scripts made executable"
echo ""

# ============================================================================
# COMPLETE
# ============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PREP COMPLETE - Ready to Run!                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Next step: Run the application"
echo ""
echo -e "  ${GREEN}cd ~/OSPF2-LL-JSON/netviz-pro && ./run.sh${NC}"
echo ""
echo "  Or manually:"
echo "  cd ~/OSPF2-LL-JSON/netviz-pro && npm run dev:full"
echo ""
