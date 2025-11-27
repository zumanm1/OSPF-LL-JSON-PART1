#!/bin/bash
# ============================================================================
# NetViz Pro - Clean Database Script
# ============================================================================
# Removes database and restarts with fresh default admin
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_FILE="$SCRIPT_DIR/server/users.db"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - Database Reset                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show current state
if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(ls -lh "$DB_FILE" 2>/dev/null | awk '{print $5}')
    echo -e "  Current database: ${CYAN}$DB_FILE${NC}"
    echo -e "  Size: $DB_SIZE"
    echo ""
else
    echo -e "  ${YELLOW}No existing database found${NC}"
    echo ""
fi

# Confirm
echo -e "${YELLOW}WARNING: This will DELETE all users and reset to default admin.${NC}"
echo ""
read -p "Continue? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo ""
    echo -e "${YELLOW}Cancelled.${NC}"
    echo ""
    exit 0
fi

echo ""

# Stop servers first
echo -e "${YELLOW}[Step 1/3]${NC} Stopping servers..."
"$SCRIPT_DIR/stop.sh" 2>/dev/null | grep -E "✓|✗|No running" | sed 's/^/  /'

sleep 1

# Remove database
echo ""
echo -e "${YELLOW}[Step 2/3]${NC} Removing database..."
if [ -f "$DB_FILE" ]; then
    rm -f "$DB_FILE"
    echo -e "  ${GREEN}✓${NC} Database removed: $DB_FILE"
else
    echo -e "  ${GREEN}✓${NC} No existing database found"
fi

echo ""
echo -e "${GREEN}Database will be recreated on next start with:${NC}"
echo ""
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │  Username: admin                                            │"
echo "  │  Password: admin123                                         │"
echo "  │  (Password change required after 10 logins)                 │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""

# Ask to start
read -p "Start servers now? (Y/n): " start_now
if [[ "$start_now" != "n" && "$start_now" != "N" ]]; then
    echo ""
    echo -e "${YELLOW}[Step 3/3]${NC} Starting servers..."
    "$SCRIPT_DIR/start.sh"
else
    echo ""
    echo "To start later, run:"
    echo -e "  ${GREEN}cd $SCRIPT_DIR && ./start.sh${NC}"
    echo ""
fi
