#!/bin/bash
# ============================================================================
# NetViz Pro - Restart Script
# ============================================================================
# Stops and starts all servers
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - Restarting...                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop
echo -e "${YELLOW}[Step 1/2]${NC} Stopping servers..."
"$SCRIPT_DIR/stop.sh" 2>/dev/null | grep -v "^$" | sed 's/^/  /'

# Wait for ports to clear
sleep 2

# Start
echo ""
echo -e "${YELLOW}[Step 2/2]${NC} Starting servers..."
"$SCRIPT_DIR/start.sh" 2>/dev/null | grep -v "^$" | sed 's/^/  /'

echo ""
echo -e "${GREEN}Restart complete!${NC}"
echo ""
