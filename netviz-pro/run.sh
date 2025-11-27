#!/bin/bash
# ============================================================================
# NetViz Pro - RUN & VALIDATE Script (Step 2 of 2)
# ============================================================================
# Run this AFTER prep.sh to start and validate the application
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="$HOME/OSPF2-LL-JSON/netviz-pro"
LOG_FILE="/tmp/netviz-pro.log"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - RUN & VALIDATE (Step 2 of 2)                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Check we're in the right directory
# ============================================================================
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}Error: Cannot find package.json${NC}"
    echo "Please run prep.sh first or cd to the correct directory"
    exit 1
fi

cd "$APP_DIR"

# ============================================================================
# PHASE 1: Stop any running instances
# ============================================================================
echo -e "${YELLOW}[PHASE 1]${NC} Stopping any running instances..."
echo ""

for PORT in 9040 9041 9042; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Stopped process on port $PORT"
    fi
done

sleep 1
echo ""

# ============================================================================
# PHASE 2: Start Application
# ============================================================================
echo -e "${YELLOW}[PHASE 2]${NC} Starting Application..."
echo ""

# Start in background
nohup npm run dev:full > "$LOG_FILE" 2>&1 &
APP_PID=$!

echo -e "  ${GREEN}✓${NC} Application starting (PID: $APP_PID)"
echo -e "  ${GREEN}✓${NC} Log file: $LOG_FILE"
echo ""

# ============================================================================
# PHASE 3: Wait for servers to start
# ============================================================================
echo -e "${YELLOW}[PHASE 3]${NC} Waiting for servers to initialize..."
echo ""

WAIT_TIME=0
MAX_WAIT=30
ALL_UP=false

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    GATEWAY=$(lsof -ti:9040 2>/dev/null || true)
    AUTH=$(lsof -ti:9041 2>/dev/null || true)
    VITE=$(lsof -ti:9042 2>/dev/null || true)

    if [ -n "$GATEWAY" ] && [ -n "$AUTH" ] && [ -n "$VITE" ]; then
        ALL_UP=true
        break
    fi

    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
    echo -ne "\r  Waiting... ${WAIT_TIME}s "
done

echo ""
echo ""

# ============================================================================
# PHASE 4: Validate Services
# ============================================================================
echo -e "${YELLOW}[PHASE 4]${NC} Validating Services..."
echo ""

VALIDATION_PASSED=true

# Check Gateway (port 9040)
if lsof -ti:9040 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Gateway Server (port 9040) - RUNNING"
else
    echo -e "  ${RED}✗${NC} Gateway Server (port 9040) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

# Check Auth Server (port 9041)
if lsof -ti:9041 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Auth Server (port 9041) - RUNNING"
else
    echo -e "  ${RED}✗${NC} Auth Server (port 9041) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

# Check Vite (port 9042)
if lsof -ti:9042 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Vite Server (port 9042) - RUNNING"
else
    echo -e "  ${RED}✗${NC} Vite Server (port 9042) - NOT RUNNING"
    VALIDATION_PASSED=false
fi

echo ""

# ============================================================================
# PHASE 5: API Health Check
# ============================================================================
echo -e "${YELLOW}[PHASE 5]${NC} API Health Check..."
echo ""

# Check Auth API health endpoint
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:9041/api/health 2>/dev/null || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "  ${GREEN}✓${NC} Auth API health check - PASSED"
else
    echo -e "  ${RED}✗${NC} Auth API health check - FAILED"
    VALIDATION_PASSED=false
fi

# Check Gateway responds with login page
GATEWAY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9040 2>/dev/null || echo "000")

if [ "$GATEWAY_RESPONSE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} Gateway responds with login page - PASSED"
else
    echo -e "  ${RED}✗${NC} Gateway response check - FAILED (HTTP $GATEWAY_RESPONSE)"
    VALIDATION_PASSED=false
fi

echo ""

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
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  Access URL:    http://localhost:9040                   │"
    echo "  │  Username:      admin                                   │"
    echo "  │  Password:      admin123                                │"
    echo "  │                                                         │"
    echo "  │  IMPORTANT: Change password after first login!          │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  Server Architecture:"
    echo "  ├── Gateway (public):     Port 9040"
    echo "  ├── Auth API (localhost): Port 9041"
    echo "  └── Vite (localhost):     Port 9042"
    echo ""
    echo "  Useful Commands:"
    echo "  - View logs:  tail -f $LOG_FILE"
    echo "  - Stop all:   lsof -ti:9040,9041,9042 | xargs kill -9"
    echo ""
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     VALIDATION FAILED                                        ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Check logs for errors:"
    echo "  tail -f $LOG_FILE"
    echo ""
    echo "  Try running manually:"
    echo "  cd $APP_DIR && npm run dev:full"
    echo ""
    exit 1
fi
