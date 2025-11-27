#!/bin/bash
# ============================================================================
# NetViz Pro - Start Script
# ============================================================================
# Starts all servers in background
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR"
LOG_FILE="/tmp/netviz-pro.log"

echo ""
echo -e "${BLUE}Starting NetViz Pro...${NC}"
echo ""

# Change to app directory
cd "$APP_DIR" 2>/dev/null || {
    echo -e "${RED}Error: Cannot find app directory${NC}"
    exit 1
}

# Check package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo "Please run prep.sh first"
    exit 1
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Helper function to check port
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

# Check if already running
ALREADY_RUNNING=0
for PORT in 9040 9041 9042; do
    if [ -n "$(check_port $PORT)" ]; then
        ALREADY_RUNNING=$((ALREADY_RUNNING + 1))
    fi
done

if [ $ALREADY_RUNNING -eq 3 ]; then
    echo -e "${YELLOW}NetViz Pro is already running!${NC}"
    echo ""
    echo "  Gateway:  http://localhost:9040"
    echo "  Auth API: http://127.0.0.1:9041"
    echo "  Vite:     http://127.0.0.1:9042"
    echo ""
    echo "  Use ./stop.sh to stop, or ./restart.sh to restart"
    exit 0
fi

# Clear log and start
> "$LOG_FILE"
nohup npm run dev:full >> "$LOG_FILE" 2>&1 &
APP_PID=$!

echo -e "  Starting servers (PID: $APP_PID)..."
echo ""

# Wait for startup
WAIT_TIME=0
MAX_WAIT=30
printf "  Waiting: ["

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    GATEWAY=$(check_port 9040)
    AUTH=$(check_port 9041)
    VITE=$(check_port 9042)

    if [ -n "$GATEWAY" ] && [ -n "$AUTH" ] && [ -n "$VITE" ]; then
        break
    fi

    printf "."
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
done
printf "] ${WAIT_TIME}s\n"
echo ""

# Check results
SERVICES_UP=0

if [ -n "$(check_port 9040)" ]; then
    echo -e "  ${GREEN}✓${NC} Gateway (9040) running"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Gateway (9040) not running"
fi

if [ -n "$(check_port 9041)" ]; then
    echo -e "  ${GREEN}✓${NC} Auth API (9041) running"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Auth API (9041) not running"
fi

if [ -n "$(check_port 9042)" ]; then
    echo -e "  ${GREEN}✓${NC} Vite (9042) running"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Vite (9042) not running"
fi

echo ""

if [ $SERVICES_UP -eq 3 ]; then
    echo -e "${GREEN}NetViz Pro started successfully!${NC}"
    echo ""
    echo "  Access: http://localhost:9040"
    echo "  Logs:   tail -f $LOG_FILE"
else
    echo -e "${YELLOW}Warning: Only $SERVICES_UP/3 services running${NC}"
    echo ""
    echo "  Check logs: tail -f $LOG_FILE"
fi
echo ""
