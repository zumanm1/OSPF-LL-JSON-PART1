#!/bin/bash

################################################################################
# NetViz Pro - Stop All Servers
################################################################################

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Stopping Servers"
echo "════════════════════════════════════════════════════════════════"
echo ""

STOPPED=0

# Stop auth server
if [ -f ".pids/auth-server.pid" ]; then
    AUTH_PID=$(cat .pids/auth-server.pid)
    if kill -0 $AUTH_PID 2>/dev/null; then
        kill $AUTH_PID
        echo -e "${GREEN}✓ Auth server stopped (PID: $AUTH_PID)${NC}"
        STOPPED=$((STOPPED + 1))
    else
        echo -e "${YELLOW}⚠ Auth server not running${NC}"
    fi
    rm -f .pids/auth-server.pid
fi

# Stop Vite server
if [ -f ".pids/vite.pid" ]; then
    VITE_PID=$(cat .pids/vite.pid)
    if kill -0 $VITE_PID 2>/dev/null; then
        kill $VITE_PID
        echo -e "${GREEN}✓ Vite server stopped (PID: $VITE_PID)${NC}"
        STOPPED=$((STOPPED + 1))
    else
        echo -e "${YELLOW}⚠ Vite server not running${NC}"
    fi
    rm -f .pids/vite.pid
fi

# Fallback: kill by process name
if [ $STOPPED -eq 0 ]; then
    echo -e "${YELLOW}No PID files found. Searching for running processes...${NC}"
    
    # Kill node processes running server/index.js
    pkill -f "node server/index.js" && echo -e "${GREEN}✓ Auth server stopped${NC}"
    
    # Kill vite processes
    pkill -f "vite" && echo -e "${GREEN}✓ Vite server stopped${NC}"
fi

# Clean up PID directory
rm -rf .pids

echo ""
echo -e "${GREEN}✓ All servers stopped${NC}"
echo ""
