#!/bin/bash
# ============================================================================
# NetViz Pro - RUN & VALIDATE Script (Step 2 of 2)
# ============================================================================
# Starts and validates the application
# Run this AFTER prep.sh
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${SCRIPT_DIR}"
LOG_FILE="/tmp/netviz-pro.log"
MAX_WAIT=45
HEALTH_RETRIES=5

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - RUN & VALIDATE (Step 2 of 2)                ║${NC}"
echo -e "${BLUE}║     Version: 2.0                                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Check we're in the right directory
# ============================================================================
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}Error: Cannot find package.json in $APP_DIR${NC}"
    echo ""
    echo "Please run prep.sh first:"
    echo -e "${CYAN}curl -fsSL https://raw.githubusercontent.com/zumanm1/OSPF2-LL-JSON/main/netviz-pro/prep.sh | bash${NC}"
    exit 1
fi

cd "$APP_DIR"

# ============================================================================
# Helper function: Check port
# ============================================================================
check_port() {
    local PORT=$1
    if command -v lsof &> /dev/null; then
        lsof -ti:$PORT 2>/dev/null
    elif command -v fuser &> /dev/null; then
        fuser $PORT/tcp 2>/dev/null | awk '{print $1}'
    elif command -v ss &> /dev/null; then
        ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+'
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1
    else
        echo ""
    fi
}

# ============================================================================
# Helper function: Stop port
# ============================================================================
stop_port() {
    local PORT=$1
    local PID=$(check_port $PORT)

    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Stopped process on port $PORT (PID: $PID)"
        return 0
    fi
    return 1
}

# ============================================================================
# PHASE 1: Stop any running instances
# ============================================================================
echo -e "${YELLOW}[PHASE 1/5]${NC} Stopping any running instances..."
echo ""

STOPPED=0
for PORT in 9040 9041 9042; do
    if stop_port $PORT; then
        STOPPED=$((STOPPED + 1))
    fi
done

if [ $STOPPED -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} No running instances found"
fi

sleep 1
echo ""

# ============================================================================
# PHASE 2: Check dependencies
# ============================================================================
echo -e "${YELLOW}[PHASE 2/5]${NC} Checking Dependencies..."
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "  ${YELLOW}!${NC} node_modules not found, running npm install..."
    npm install 2>&1 | sed 's/^/  /'
    echo ""
fi

if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} node_modules found ($MODULE_COUNT packages)"
else
    echo -e "  ${RED}✗${NC} node_modules missing - run prep.sh first"
    exit 1
fi

echo ""

# ============================================================================
# PHASE 3: Start Application
# ============================================================================
echo -e "${YELLOW}[PHASE 3/5]${NC} Starting Application..."
echo ""

# Clear old log
> "$LOG_FILE"

# Start in background
nohup npm run dev:full >> "$LOG_FILE" 2>&1 &
APP_PID=$!

echo -e "  ${GREEN}✓${NC} Application starting (Main PID: $APP_PID)"
echo -e "  ${GREEN}✓${NC} Log file: $LOG_FILE"
echo ""

# ============================================================================
# PHASE 4: Wait for servers to start
# ============================================================================
echo -e "${YELLOW}[PHASE 4/5]${NC} Waiting for servers to initialize..."
echo ""

WAIT_TIME=0
ALL_UP=false

# Progress indicator
printf "  ["
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    GATEWAY=$(check_port 9040)
    AUTH=$(check_port 9041)
    VITE=$(check_port 9042)

    if [ -n "$GATEWAY" ] && [ -n "$AUTH" ] && [ -n "$VITE" ]; then
        ALL_UP=true
        break
    fi

    printf "."
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
done
printf "] ${WAIT_TIME}s\n"
echo ""

if [ "$ALL_UP" = false ]; then
    echo -e "  ${YELLOW}!${NC} Not all servers started within ${MAX_WAIT}s"
    echo "  Continuing with validation..."
fi

echo ""

# ============================================================================
# PHASE 5: Validate Services
# ============================================================================
echo -e "${YELLOW}[PHASE 5/5]${NC} Validating Services..."
echo ""

VALIDATION_PASSED=true
SERVICES_UP=0

# Check Gateway (port 9040)
GATEWAY_PID=$(check_port 9040)
if [ -n "$GATEWAY_PID" ]; then
    echo -e "  ${GREEN}✓${NC} Gateway Server (port 9040) - RUNNING (PID: $GATEWAY_PID)"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Gateway Server (port 9040) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

# Check Auth Server (port 9041)
AUTH_PID=$(check_port 9041)
if [ -n "$AUTH_PID" ]; then
    echo -e "  ${GREEN}✓${NC} Auth Server (port 9041) - RUNNING (PID: $AUTH_PID)"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Auth Server (port 9041) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

# Check Vite (port 9042)
VITE_PID=$(check_port 9042)
if [ -n "$VITE_PID" ]; then
    echo -e "  ${GREEN}✓${NC} Vite Server (port 9042) - RUNNING (PID: $VITE_PID)"
    SERVICES_UP=$((SERVICES_UP + 1))
else
    echo -e "  ${RED}✗${NC} Vite Server (port 9042) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

echo ""

# API Health Check (only if curl available)
if command -v curl &> /dev/null; then
    echo "  API Health Checks:"

    # Auth API health check with retries
    AUTH_OK=false
    for i in $(seq 1 $HEALTH_RETRIES); do
        HEALTH_RESPONSE=$(curl -s -m 5 http://127.0.0.1:9041/api/health 2>/dev/null || echo "FAILED")
        if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
            AUTH_OK=true
            break
        fi
        sleep 1
    done

    if [ "$AUTH_OK" = true ]; then
        echo -e "  ${GREEN}✓${NC} Auth API /api/health - OK"
    else
        echo -e "  ${RED}✗${NC} Auth API /api/health - FAILED"
        VALIDATION_PASSED=false
    fi

    # Gateway check with retries
    GATEWAY_OK=false
    for i in $(seq 1 $HEALTH_RETRIES); do
        GATEWAY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:9040 2>/dev/null || echo "000")
        if [ "$GATEWAY_CODE" = "200" ]; then
            GATEWAY_OK=true
            break
        fi
        sleep 1
    done

    if [ "$GATEWAY_OK" = true ]; then
        echo -e "  ${GREEN}✓${NC} Gateway http://localhost:9040 - OK (HTTP 200)"
    else
        echo -e "  ${RED}✗${NC} Gateway http://localhost:9040 - FAILED (HTTP $GATEWAY_CODE)"
        VALIDATION_PASSED=false
    fi

    echo ""
else
    echo -e "  ${YELLOW}!${NC} curl not available - skipping API health checks"
    echo ""
fi

# ============================================================================
# RESULTS
# ============================================================================
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ${GREEN}ALL VALIDATIONS PASSED${BLUE}                                  ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}NetViz Pro is running successfully!${NC}"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │                                                             │"
    echo "  │  Access URL:    http://localhost:9040                       │"
    echo "  │  Network URL:   http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_IP"):9040       │"
    echo "  │                                                             │"
    echo "  │  Username:      admin                                       │"
    echo "  │  Password:      admin123                                    │"
    echo "  │                                                             │"
    echo "  │  IMPORTANT: Change password after first login!              │"
    echo "  │                                                             │"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  Server Architecture:"
    echo "  ├── Gateway (public):     Port 9040"
    echo "  ├── Auth API (localhost): Port 9041"
    echo "  └── Vite (localhost):     Port 9042"
    echo ""
    echo "  Useful Commands:"
    echo "  ├── View logs:  tail -f $LOG_FILE"
    echo "  ├── Stop all:   ./stop.sh"
    echo "  ├── Restart:    ./restart.sh"
    echo "  └── Reset DB:   ./clean-db.sh"
    echo ""
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     VALIDATION FAILED ($SERVICES_UP/3 services running)               ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Troubleshooting:"
    echo ""
    echo "  1. Check logs for errors:"
    echo "     tail -50 $LOG_FILE"
    echo ""
    echo "  2. Try running manually:"
    echo "     cd $APP_DIR && npm run dev:full"
    echo ""
    echo "  3. Check if ports are blocked:"
    echo "     lsof -i:9040,9041,9042"
    echo ""
    echo "  4. Reinstall:"
    echo "     ./prep.sh"
    echo ""
    exit 1
fi
