#!/bin/bash

################################################################################
# NetViz Pro - Start Development Server
# Supports isolated Node.js environments via nvm, volta, or fnm
################################################################################

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Required Node version (from .nvmrc)
REQUIRED_NODE_VERSION="20"

# ============================================================================
# Load nvm if available and switch to project Node version
# ============================================================================
load_nvm() {
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
        
        if [ -f ".nvmrc" ]; then
            local REQUIRED=$(cat .nvmrc)
            local CURRENT=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
            
            if [ "$CURRENT" != "$REQUIRED" ]; then
                echo -e "  ${YELLOW}⚠${NC} Switching to Node $REQUIRED (project requirement)..."
                nvm use "$REQUIRED" 2>/dev/null || nvm install "$REQUIRED"
            fi
        fi
        return 0
    fi
    return 1
}

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Starting Development Server"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Load nvm and switch to project version if available
load_nvm

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}✗ .env.local not found!${NC}"
    echo ""
    echo "Please create .env.local with your configuration:"
    echo "  cp .env.local.example .env.local"
    echo "  # Edit .env.local with your secure credentials"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Configuration found${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not installed. Running npm install...${NC}"
    npm install
    echo ""
fi

# Create PID directory
mkdir -p .pids

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    
    if [ -f ".pids/auth-server.pid" ]; then
        AUTH_PID=$(cat .pids/auth-server.pid)
        kill $AUTH_PID 2>/dev/null && echo -e "${GREEN}✓ Auth server stopped${NC}"
        rm -f .pids/auth-server.pid
    fi
    
    if [ -f ".pids/gateway.pid" ]; then
        GATEWAY_PID=$(cat .pids/gateway.pid)
        kill $GATEWAY_PID 2>/dev/null && echo -e "${GREEN}✓ Gateway server stopped${NC}"
        rm -f .pids/gateway.pid
    fi
    
    if [ -f ".pids/vite.pid" ]; then
        VITE_PID=$(cat .pids/vite.pid)
        kill $VITE_PID 2>/dev/null && echo -e "${GREEN}✓ Vite server stopped${NC}"
        rm -f .pids/vite.pid
    fi
    
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Start auth server
echo -e "${BLUE}Starting auth server...${NC}"
node server/index.js &
AUTH_PID=$!
echo $AUTH_PID > .pids/auth-server.pid
echo -e "${GREEN}✓ Auth server started (PID: $AUTH_PID)${NC}"

# Wait a moment for auth server to initialize
sleep 2

# CRITICAL PRODUCTION SECURITY: Start gateway server (security layer with helmet middleware)
echo -e "${BLUE}Starting gateway server (security layer)...${NC}"
node server/gateway.js &
GATEWAY_PID=$!
echo $GATEWAY_PID > .pids/gateway.pid
echo -e "${GREEN}✓ Gateway server started (PID: $GATEWAY_PID)${NC}"

# Wait a moment for gateway to initialize
sleep 2

# Start Vite dev server (internal only, proxied through gateway)
echo -e "${BLUE}Starting Vite dev server (internal)...${NC}"
npm run dev &
VITE_PID=$!
echo $VITE_PID > .pids/vite.pid
echo -e "${GREEN}✓ Vite server started (PID: $VITE_PID)${NC}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ NetViz Pro is running with enterprise security!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Services:"
echo "  • Auth Server:  http://localhost:9041 (internal)"
echo "  • Gateway:      http://localhost:9040 (👉 USE THIS - secured with helmet)"
echo "  • Vite Dev:     http://localhost:9042 (internal, proxied through gateway)"
echo ""
echo "🔒 Security Features Active:"
echo "  ✅ CSP, HSTS, X-Frame-Options"
echo "  ✅ Rate limiting on auth endpoints"
echo "  ✅ Prototype pollution prevention"
echo "  ✅ Audit logging for admin actions"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for all processes
wait $AUTH_PID $GATEWAY_PID $VITE_PID
