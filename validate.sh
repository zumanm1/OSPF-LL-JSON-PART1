#!/bin/bash
#===============================================================================
# App2 - NetViz Pro Validator
# Purpose: Validate all components are running correctly
# Ports: Gateway (9040), Auth Server (9041), Vite Dev (9042)
# GitHub: https://github.com/zumanm1/OSPF-LL-JSON-PART1
#===============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
APP_NAME="App2 - NetViz Pro"
GATEWAY_PORT=9040
AUTH_PORT=9041
VITE_PORT=9042
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Counters
PASS=0
FAIL=0
WARN=0

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
log_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              $APP_NAME - Validation                   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "  ${YELLOW}!${NC} $1"
    ((WARN++))
}

check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

#-------------------------------------------------------------------------------
# Validation Checks
#-------------------------------------------------------------------------------
validate_ports() {
    echo -e "${BLUE}[1/6] Checking Ports...${NC}"

    if check_port $GATEWAY_PORT; then
        check_pass "Gateway port $GATEWAY_PORT is UP"
    else
        check_fail "Gateway port $GATEWAY_PORT is DOWN"
    fi

    if check_port $AUTH_PORT; then
        check_pass "Auth server port $AUTH_PORT is UP"
    else
        check_fail "Auth server port $AUTH_PORT is DOWN"
    fi

    if check_port $VITE_PORT; then
        check_pass "Vite dev port $VITE_PORT is UP"
    else
        check_fail "Vite dev port $VITE_PORT is DOWN"
    fi
}

validate_gateway() {
    echo -e "${BLUE}[2/6] Checking Gateway...${NC}"

    local health=$(curl -s http://localhost:$GATEWAY_PORT/health 2>/dev/null)
    if echo "$health" | grep -qi "ok\|healthy\|alive"; then
        check_pass "Gateway health: OK"
    else
        local response=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$GATEWAY_PORT 2>/dev/null)
        if [ "$response" = "200" ] || [ "$response" = "302" ]; then
            check_pass "Gateway responding (HTTP $response)"
        else
            check_fail "Gateway not responding (HTTP $response)"
        fi
    fi
}

validate_auth_server() {
    echo -e "${BLUE}[3/6] Checking Auth Server...${NC}"

    local health=$(curl -s http://localhost:$AUTH_PORT/health 2>/dev/null)
    if echo "$health" | grep -qi "ok\|healthy"; then
        check_pass "Auth server health: OK"
    else
        local response=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$AUTH_PORT 2>/dev/null)
        if [ "$response" = "200" ] || [ "$response" = "401" ]; then
            check_pass "Auth server responding (HTTP $response)"
        else
            check_fail "Auth server not responding"
        fi
    fi
}

validate_frontend() {
    echo -e "${BLUE}[4/6] Checking Frontend (Vite)...${NC}"

    local response=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$VITE_PORT 2>/dev/null)
    if [ "$response" = "200" ]; then
        check_pass "Frontend responding (HTTP $response)"
    else
        check_fail "Frontend not responding (HTTP $response)"
    fi
}

validate_cors() {
    echo -e "${BLUE}[5/6] Checking CORS...${NC}"

    local cors_header=$(curl -s -I -X OPTIONS http://localhost:$GATEWAY_PORT 2>/dev/null | grep -i "access-control")
    if [ -n "$cors_header" ]; then
        check_pass "CORS headers present on gateway"
    else
        check_warn "CORS headers not detected (may be OK)"
    fi
}

validate_files() {
    echo -e "${BLUE}[6/6] Checking Files...${NC}"

    if [ -f "$SCRIPT_DIR/package.json" ]; then
        check_pass "package.json exists"
    else
        check_fail "package.json missing"
    fi

    if [ -d "$SCRIPT_DIR/node_modules" ]; then
        check_pass "node_modules installed"
    else
        check_fail "node_modules missing"
    fi

    if [ -f "$SCRIPT_DIR/.env" ]; then
        check_pass ".env configured"
    else
        check_warn ".env missing (using defaults)"
    fi
}

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
show_summary() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                      VALIDATION SUMMARY                        ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}  $PASS"
    echo -e "  ${RED}Failed:${NC}  $FAIL"
    echo -e "  ${YELLOW}Warnings:${NC} $WARN"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "  ${GREEN}Overall Status: HEALTHY${NC}"
        echo ""
        echo -e "  ${CYAN}Access URLs:${NC}"
        echo -e "    Frontend: http://localhost:$VITE_PORT"
        echo -e "    Gateway:  http://localhost:$GATEWAY_PORT"
        echo -e "    Auth:     http://localhost:$AUTH_PORT"
        return 0
    else
        echo -e "  ${RED}Overall Status: UNHEALTHY${NC}"
        echo ""
        echo -e "  ${YELLOW}Troubleshooting:${NC}"
        echo -e "    ./netviz.sh stop && ./netviz.sh start"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    log_header
    validate_ports
    validate_gateway
    validate_auth_server
    validate_frontend
    validate_cors
    validate_files
    show_summary
}

main "$@"
