#!/bin/bash
# ============================================================================
# NetViz Pro - Prerequisites Check Script
# ============================================================================
# Validates all requirements before installation
# Run this first to ensure system is ready
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Minimum versions
MIN_NODE_VERSION=18
MIN_NPM_VERSION=8
MIN_GIT_VERSION=2

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - Prerequisites Check                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# ============================================================================
# Function: Version comparison
# ============================================================================
version_gte() {
    # Returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# ============================================================================
# Check: Operating System
# ============================================================================
echo -e "${CYAN}[1/7] Operating System${NC}"
OS_NAME=$(uname -s)
OS_VERSION=$(uname -r)
echo -e "  OS: $OS_NAME $OS_VERSION"

if [ "$OS_NAME" = "Linux" ]; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo -e "  Distro: $PRETTY_NAME"
    fi
    echo -e "  ${GREEN}✓${NC} Linux detected - compatible"
elif [ "$OS_NAME" = "Darwin" ]; then
    echo -e "  ${GREEN}✓${NC} macOS detected - compatible"
else
    echo -e "  ${YELLOW}!${NC} Untested OS - may work"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================================
# Check: Git
# ============================================================================
echo -e "${CYAN}[2/7] Git${NC}"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    GIT_MAJOR=$(echo "$GIT_VERSION" | cut -d'.' -f1)

    echo -e "  Path: $(which git)"
    echo -e "  Version: $GIT_VERSION"

    if [ "$GIT_MAJOR" -ge "$MIN_GIT_VERSION" ]; then
        echo -e "  ${GREEN}✓${NC} Git version OK (minimum: $MIN_GIT_VERSION.x)"
    else
        echo -e "  ${RED}✗${NC} Git version too old (minimum: $MIN_GIT_VERSION.x)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} Git NOT FOUND"
    echo -e "  ${YELLOW}Install:${NC} sudo apt install git"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# Check: Node.js
# ============================================================================
echo -e "${CYAN}[3/7] Node.js${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | tr -d 'v')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

    echo -e "  Path: $(which node)"
    echo -e "  Version: v$NODE_VERSION"

    if [ "$NODE_MAJOR" -ge "$MIN_NODE_VERSION" ]; then
        echo -e "  ${GREEN}✓${NC} Node.js version OK (minimum: v$MIN_NODE_VERSION.x)"
    else
        echo -e "  ${RED}✗${NC} Node.js version too old (minimum: v$MIN_NODE_VERSION.x)"
        echo -e "  ${YELLOW}Install:${NC} curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} Node.js NOT FOUND"
    echo -e "  ${YELLOW}Install:${NC} curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# Check: npm
# ============================================================================
echo -e "${CYAN}[4/7] npm${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    NPM_MAJOR=$(echo "$NPM_VERSION" | cut -d'.' -f1)

    echo -e "  Path: $(which npm)"
    echo -e "  Version: v$NPM_VERSION"

    if [ "$NPM_MAJOR" -ge "$MIN_NPM_VERSION" ]; then
        echo -e "  ${GREEN}✓${NC} npm version OK (minimum: v$MIN_NPM_VERSION.x)"
    else
        echo -e "  ${YELLOW}!${NC} npm version old but may work (recommended: v$MIN_NPM_VERSION+)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} npm NOT FOUND"
    echo -e "  ${YELLOW}Note:${NC} npm is installed with Node.js"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# Check: curl
# ============================================================================
echo -e "${CYAN}[5/7] curl (for health checks)${NC}"
if command -v curl &> /dev/null; then
    CURL_VERSION=$(curl --version | head -1 | awk '{print $2}')
    echo -e "  Path: $(which curl)"
    echo -e "  Version: $CURL_VERSION"
    echo -e "  ${GREEN}✓${NC} curl available"
else
    echo -e "  ${YELLOW}!${NC} curl NOT FOUND (optional, used for health checks)"
    echo -e "  ${YELLOW}Install:${NC} sudo apt install curl"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================================
# Check: Ports
# ============================================================================
echo -e "${CYAN}[6/7] Port Availability (9040, 9041)${NC}"
PORTS_BLOCKED=0

for PORT in 9040 9041; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo -e "  Port $PORT: ${YELLOW}IN USE${NC} (PID: $PID, Process: $PROCESS)"
        PORTS_BLOCKED=$((PORTS_BLOCKED + 1))
    else
        echo -e "  Port $PORT: ${GREEN}FREE${NC}"
    fi
done

if [ $PORTS_BLOCKED -gt 0 ]; then
    echo -e "  ${YELLOW}!${NC} $PORTS_BLOCKED port(s) in use - will be stopped during install"
else
    echo -e "  ${GREEN}✓${NC} All ports available"
fi
echo ""

# ============================================================================
# Check: Disk Space
# ============================================================================
echo -e "${CYAN}[7/7] Disk Space${NC}"
DISK_FREE=$(df -h "$HOME" | awk 'NR==2 {print $4}')
DISK_FREE_MB=$(df -m "$HOME" | awk 'NR==2 {print $4}')

echo -e "  Home directory: $HOME"
echo -e "  Free space: $DISK_FREE"

if [ "$DISK_FREE_MB" -gt 500 ]; then
    echo -e "  ${GREEN}✓${NC} Sufficient disk space (need ~500MB)"
else
    echo -e "  ${RED}✗${NC} Low disk space (need ~500MB)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
        echo ""
        echo "  Your system is ready for NetViz Pro installation!"
        echo ""
        echo "  Next step:"
        echo -e "  ${GREEN}curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/prep.sh | bash${NC}"
    else
        echo -e "${GREEN}✓ CHECKS PASSED${NC} (with $WARNINGS warning(s))"
        echo ""
        echo "  Your system is ready for NetViz Pro installation."
        echo "  Review warnings above for optimal experience."
        echo ""
        echo "  Next step:"
        echo -e "  ${GREEN}curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/prep.sh | bash${NC}"
    fi
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS ERROR(S) FOUND${NC}"
    echo ""
    echo "  Please fix the errors above before installation."
    echo ""
    echo "  Quick fix for Ubuntu/Debian:"
    echo -e "  ${YELLOW}sudo apt update && sudo apt install -y git curl${NC}"
    echo -e "  ${YELLOW}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${NC}"
    echo -e "  ${YELLOW}sudo apt install -y nodejs${NC}"
    echo ""
    echo "  Then run this check again:"
    echo -e "  ${GREEN}./check.sh${NC}"
    echo ""
    exit 1
fi
