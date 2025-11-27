#!/bin/bash
# ============================================================================
# NetViz Pro - Stop Script
# ============================================================================
# Stops all running servers
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Stopping NetViz Pro...${NC}"
echo ""

# Helper function to check and stop port
stop_port() {
    local PORT=$1
    local PID=""

    # Try different methods to find PID
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti:$PORT 2>/dev/null)
    elif command -v fuser &> /dev/null; then
        PID=$(fuser $PORT/tcp 2>/dev/null | awk '{print $1}')
    elif command -v ss &> /dev/null; then
        PID=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+')
    elif command -v netstat &> /dev/null; then
        PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
    fi

    if [ -n "$PID" ]; then
        # Get process name for display
        PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")

        # Try graceful shutdown first, then force
        kill $PID 2>/dev/null
        sleep 0.5

        # Check if still running
        if kill -0 $PID 2>/dev/null; then
            kill -9 $PID 2>/dev/null
        fi

        echo -e "  ${GREEN}✓${NC} Stopped port $PORT (PID: $PID, Process: $PROCESS_NAME)"
        return 0
    fi
    return 1
}

STOPPED=0

for PORT in 9040 9041; do
    if stop_port $PORT; then
        STOPPED=$((STOPPED + 1))
    fi
done

# Also try to kill any remaining npm/node processes for netviz-pro
if command -v pkill &> /dev/null; then
    pkill -f "netviz-pro" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Cleaned up related processes"
fi

echo ""

if [ $STOPPED -eq 0 ]; then
    echo -e "${YELLOW}No running servers found.${NC}"
else
    echo -e "${GREEN}Stopped $STOPPED server(s).${NC}"
fi
echo ""
