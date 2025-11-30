#!/bin/bash

################################################################################
# NetViz Pro - Start Development Server
################################################################################

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Starting Development Server"
echo "════════════════════════════════════════════════════════════════"
echo ""

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

# Start Vite dev server
echo -e "${BLUE}Starting Vite dev server...${NC}"
npm run dev &
VITE_PID=$!
echo $VITE_PID > .pids/vite.pid
echo -e "${GREEN}✓ Vite server started (PID: $VITE_PID)${NC}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ NetViz Pro is running!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Services:"
echo "  • Auth Server:  http://localhost:9041"
echo "  • Gateway:      http://localhost:9040"
echo "  • Development:  http://localhost:5173 (Vite default)"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $AUTH_PID $VITE_PID
