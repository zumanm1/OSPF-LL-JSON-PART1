#!/bin/bash
# =============================================================================
# NetViz Pro - Start with Auth-Vault (Native Installation)
# =============================================================================
# This script ensures Auth-Vault (Keycloak + Vault) is running NATIVELY before
# starting NetViz Pro. No Docker required!
#
# Features:
#   - Installs Keycloak and Vault natively (no Docker)
#   - Works on macOS and Linux
#   - Uses $HOME/auth-vault for installation
#   - Auto-detects and installs dependencies (Java 17, etc.)
#   - Does not interfere with other running OSPF apps
#
# Usage:
#   ./start-with-auth-vault.sh           # Interactive mode
#   ./start-with-auth-vault.sh --auto    # Non-interactive (auto-install)
#   ./start-with-auth-vault.sh --help    # Show help
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Configuration - Using $HOME for cross-platform compatibility
# -----------------------------------------------------------------------------
HOME_DIR="${HOME:-$HOME}"

# Auth-Vault location (relative to home)
AUTH_VAULT_DIR="$HOME_DIR/auth-vault"
AUTH_VAULT_REPO="https://github.com/zumanm1/auth-vault.git"

# NetViz Pro location - detect from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETVIZ_DIR="$SCRIPT_DIR"

# Ports
KEYCLOAK_PORT=9120
VAULT_PORT=9121
GATEWAY_PORT=9040
AUTH_SERVER_PORT=9041

# Timeouts
SERVICE_WAIT_TIMEOUT=120

# Detect OS
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*)  OS_NAME="linux";;
    Darwin*) OS_NAME="macos";;
    *)       OS_NAME="unknown";;
esac

# Parse command line arguments
AUTO_INSTALL=false
for arg in "$@"; do
    case $arg in
        --auto|-y)
            AUTO_INSTALL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --auto, -y    Automatically install auth-vault if not found"
            echo "  --help, -h    Show this help message"
            echo ""
            exit 0
            ;;
    esac
done

echo -e "${CYAN}"
echo "============================================================================="
echo "  NetViz Pro - Start with Auth-Vault"
echo "============================================================================="
echo -e "${NC}"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_port() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
}

wait_for_url() {
    local url=$1
    local timeout=$2
    local start_time=$(date +%s)
    
    while true; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -qE "^(200|204)"; then
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            return 1
        fi
        
        sleep 2
    done
}

# -----------------------------------------------------------------------------
# Step 1: Check Auth-Vault Installation
# -----------------------------------------------------------------------------

echo -e "${CYAN}Step 1: Checking Auth-Vault installation...${NC}"
log_info "Auth-Vault directory: $AUTH_VAULT_DIR"
log_info "NetViz Pro directory: $NETVIZ_DIR"

if [ ! -d "$AUTH_VAULT_DIR" ]; then
    echo ""
    log_warning "Auth-Vault is not installed!"
    echo ""
    echo -e "  Auth-Vault provides centralized authentication (Keycloak) and"
    echo -e "  secrets management (Vault) for all OSPF applications."
    echo ""
    echo -e "  ${BLUE}Installation location:${NC} $AUTH_VAULT_DIR"
    echo -e "  ${BLUE}Repository:${NC} $AUTH_VAULT_REPO"
    echo ""
    
    # Prompt user for installation (or auto-install if --auto flag)
    if [ "$AUTO_INSTALL" = true ]; then
        REPLY="y"
        log_info "Auto-installing Auth-Vault (--auto flag detected)"
    else
        read -p "Would you like to install Auth-Vault now? (y/n): " -n 1 -r
        echo ""
    fi
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installing Auth-Vault to $AUTH_VAULT_DIR..."
        
        # Clone to home directory
        cd "$HOME_DIR"
        git clone "$AUTH_VAULT_REPO"
        
        if [ $? -eq 0 ]; then
            log_success "Auth-Vault installed successfully"
        else
            log_error "Failed to clone auth-vault repository"
            echo ""
            echo -e "  ${YELLOW}Manual installation:${NC}"
            echo -e "    cd $HOME_DIR"
            echo -e "    git clone $AUTH_VAULT_REPO"
            echo ""
            exit 1
        fi
    else
        log_error "Auth-Vault is required to run NetViz Pro with Keycloak/Vault"
        echo ""
        echo -e "  ${YELLOW}To install manually:${NC}"
        echo -e "    cd $HOME_DIR"
        echo -e "    git clone $AUTH_VAULT_REPO"
        echo ""
        echo -e "  ${YELLOW}Or run NetViz Pro without Auth-Vault:${NC}"
        echo -e "    ./start.sh"
        echo ""
        exit 1
    fi
else
    log_success "Auth-Vault found at $AUTH_VAULT_DIR"
fi

# Check for auth-vault.sh (native installation script)
if [ ! -f "$AUTH_VAULT_DIR/auth-vault.sh" ]; then
    log_error "auth-vault.sh not found in auth-vault"
    log_info "The auth-vault installation may be incomplete"
    echo ""
    echo -e "  ${YELLOW}Try reinstalling:${NC}"
    echo -e "    rm -rf $AUTH_VAULT_DIR"
    echo -e "    git clone $AUTH_VAULT_REPO $AUTH_VAULT_DIR"
    echo ""
    exit 1
fi

# Check for .env file
if [ ! -f "$AUTH_VAULT_DIR/.env" ]; then
    if [ -f "$AUTH_VAULT_DIR/.env.example" ]; then
        log_warning ".env not found, copying from .env.example"
        cp "$AUTH_VAULT_DIR/.env.example" "$AUTH_VAULT_DIR/.env"
        log_success ".env file created at $AUTH_VAULT_DIR/.env"
    else
        log_error ".env.example not found in auth-vault"
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Step 2: Check Native Auth-Vault Installation
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 2: Checking Auth-Vault native installation...${NC}"
log_info "Detected OS: $OS_NAME"

# Check if auth-vault.sh exists
if [ ! -f "$AUTH_VAULT_DIR/auth-vault.sh" ]; then
    log_error "auth-vault.sh not found in $AUTH_VAULT_DIR"
    exit 1
fi

# Make sure it's executable
chmod +x "$AUTH_VAULT_DIR/auth-vault.sh"

# Check if Keycloak and Vault are installed natively
KEYCLOAK_INSTALLED=false
VAULT_INSTALLED=false

if [ -d "$AUTH_VAULT_DIR/bin/keycloak" ]; then
    KEYCLOAK_INSTALLED=true
    log_success "Keycloak is installed natively"
else
    log_warning "Keycloak is not installed"
fi

if [ -f "$AUTH_VAULT_DIR/bin/vault" ]; then
    VAULT_INSTALLED=true
    log_success "Vault is installed natively"
else
    log_warning "Vault is not installed"
fi

# If not installed, run the install command
if [ "$KEYCLOAK_INSTALLED" = false ] || [ "$VAULT_INSTALLED" = false ]; then
    echo ""
    log_warning "Auth-Vault components need to be installed"
    echo ""
    echo -e "  This will install Keycloak and Vault natively (no Docker required)."
    echo -e "  Installation includes: Java 17, Keycloak, Vault, and dependencies."
    echo ""
    
    if [ "$AUTO_INSTALL" = true ]; then
        REPLY="y"
        log_info "Auto-installing Auth-Vault components (--auto flag detected)"
    else
        read -p "Would you like to install Auth-Vault components now? (y/n): " -n 1 -r
        echo ""
    fi
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Running auth-vault.sh install..."
        cd "$AUTH_VAULT_DIR"
        ./auth-vault.sh install
        
        if [ $? -eq 0 ]; then
            log_success "Auth-Vault components installed successfully"
        else
            log_error "Failed to install Auth-Vault components"
            echo ""
            echo -e "  ${YELLOW}Try installing manually:${NC}"
            echo -e "    cd $AUTH_VAULT_DIR"
            echo -e "    ./auth-vault.sh install"
            echo ""
            exit 1
        fi
    else
        log_error "Auth-Vault components are required"
        echo ""
        echo -e "  ${YELLOW}To install manually:${NC}"
        echo -e "    cd $AUTH_VAULT_DIR"
        echo -e "    ./auth-vault.sh install"
        echo ""
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Step 3: Start Auth-Vault Services (Native)
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 3: Starting Auth-Vault services (native)...${NC}"

cd "$AUTH_VAULT_DIR"

# Check if services are already running by checking ports
KEYCLOAK_RUNNING=false
VAULT_RUNNING=false

if check_port $KEYCLOAK_PORT; then
    KEYCLOAK_RUNNING=true
fi

if check_port $VAULT_PORT; then
    VAULT_RUNNING=true
fi

if [ "$KEYCLOAK_RUNNING" = true ] && [ "$VAULT_RUNNING" = true ]; then
    log_success "Auth-Vault services are already running"
else
    log_info "Starting Keycloak and Vault natively..."
    
    ./auth-vault.sh start
    
    if [ $? -eq 0 ]; then
        log_success "Auth-Vault services started"
    else
        log_error "Failed to start Auth-Vault services"
        echo ""
        echo -e "  ${YELLOW}Try starting manually:${NC}"
        echo -e "    cd $AUTH_VAULT_DIR"
        echo -e "    ./auth-vault.sh start"
        echo ""
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Step 4: Wait for Services to be Healthy
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 4: Waiting for services to be healthy...${NC}"

# Wait for Keycloak
log_info "Waiting for Keycloak (port $KEYCLOAK_PORT)..."
if wait_for_url "http://localhost:$KEYCLOAK_PORT/health/ready" $SERVICE_WAIT_TIMEOUT; then
    log_success "Keycloak is healthy"
else
    log_error "Keycloak failed to become healthy within ${SERVICE_WAIT_TIMEOUT}s"
    log_info "Check logs: cd ~/auth-vault && ./auth-vault.sh status"
    exit 1
fi

# Wait for Vault
log_info "Waiting for Vault (port $VAULT_PORT)..."
if wait_for_url "http://localhost:$VAULT_PORT/v1/sys/health" $SERVICE_WAIT_TIMEOUT; then
    log_success "Vault is healthy"
else
    log_error "Vault failed to become healthy within ${SERVICE_WAIT_TIMEOUT}s"
    log_info "Check logs: cd ~/auth-vault && ./auth-vault.sh status"
    exit 1
fi

# Verify Keycloak realm exists
log_info "Verifying Keycloak realm..."
REALM_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$KEYCLOAK_PORT/realms/ospf-ll-json-part1")
if [ "$REALM_CHECK" = "200" ]; then
    log_success "Keycloak realm 'ospf-ll-json-part1' is available"
else
    log_warning "Keycloak realm not found (HTTP $REALM_CHECK)"
    log_info "The realm may need to be created manually"
fi

# -----------------------------------------------------------------------------
# Step 5: Configure NetViz Pro
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 5: Configuring NetViz Pro...${NC}"

cd "$NETVIZ_DIR"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        log_warning ".env.local not found, copying from .env.local.example"
        cp ".env.local.example" ".env.local"
    else
        log_error ".env.local.example not found"
        exit 1
    fi
fi

# Check if auth-vault settings are in .env.local
if ! grep -q "KEYCLOAK_URL" .env.local; then
    log_info "Adding Auth-Vault configuration to .env.local..."
    
    cat >> .env.local << 'EOF'

# ==============================================================================
# AUTH-VAULT INTEGRATION (Keycloak + Vault)
# ==============================================================================
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:9120
KEYCLOAK_REALM=ospf-ll-json-part1
KEYCLOAK_CLIENT_ID=netviz-pro-api

# Vault Configuration (using dev token for now)
VAULT_ADDR=http://localhost:9121
VAULT_TOKEN=ospf-vault-dev-token-2025
EOF
    
    log_success "Auth-Vault configuration added to .env.local"
else
    log_success "Auth-Vault configuration already present in .env.local"
fi

# -----------------------------------------------------------------------------
# Step 6: Check Other Running OSPF Apps (Non-Destructive)
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 6: Checking other OSPF applications...${NC}"

# Define all OSPF app ports (we will NOT touch these)
OTHER_APP_PORTS=(
    "9050:9051:Device Manager"
    "9080:9081:Visualizer Pro"
    "9090:9091:Impact Planner"
    "9100:9101:Tempo-X"
)

RUNNING_APPS=()
for app_info in "${OTHER_APP_PORTS[@]}"; do
    IFS=':' read -r frontend backend name <<< "$app_info"
    if check_port $frontend || check_port $backend; then
        RUNNING_APPS+=("$name (ports $frontend/$backend)")
    fi
done

if [ ${#RUNNING_APPS[@]} -gt 0 ]; then
    log_info "Other OSPF apps currently running (will NOT be affected):"
    for app in "${RUNNING_APPS[@]}"; do
        echo -e "    ${GREEN}✓${NC} $app"
    done
else
    log_info "No other OSPF apps are currently running"
fi

# -----------------------------------------------------------------------------
# Step 7: Stop Existing NetViz Pro Servers ONLY
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 7: Managing NetViz Pro servers (ports 9040-9042 only)...${NC}"

# ONLY kill processes on NetViz Pro ports - DO NOT touch other apps
NETVIZ_PORTS=($GATEWAY_PORT $AUTH_SERVER_PORT 9042)
STOPPED_ANY=false

for port in "${NETVIZ_PORTS[@]}"; do
    if check_port $port; then
        log_info "Stopping existing NetViz Pro process on port $port..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        STOPPED_ANY=true
    fi
done

sleep 2

if [ "$STOPPED_ANY" = true ]; then
    log_success "Existing NetViz Pro servers stopped"
else
    log_info "No existing NetViz Pro servers were running"
fi

# -----------------------------------------------------------------------------
# Step 8: Start NetViz Pro
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 8: Starting NetViz Pro...${NC}"

cd "$NETVIZ_DIR"

# Start using the existing start.sh script
if [ -f "./start.sh" ]; then
    log_info "Starting NetViz Pro servers..."
    ./start.sh &
    
    # Wait for servers to start
    sleep 10
    
    # Check if servers are running
    if check_port $GATEWAY_PORT && check_port $AUTH_SERVER_PORT; then
        log_success "NetViz Pro servers started"
    else
        log_warning "Servers may still be starting..."
    fi
else
    log_error "start.sh not found"
    exit 1
fi

# -----------------------------------------------------------------------------
# Step 9: Verify Integration
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}Step 9: Verifying Auth-Vault integration...${NC}"

sleep 5

# Check health endpoint
HEALTH_RESPONSE=$(curl -s "http://localhost:$AUTH_SERVER_PORT/api/health" 2>/dev/null || echo "{}")
AUTH_MODE=$(echo "$HEALTH_RESPONSE" | grep -o '"authMode":"[^"]*"' | cut -d'"' -f4)
AUTH_VAULT_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"authVault":"[^"]*"' | cut -d'"' -f4)

if [ "$AUTH_MODE" = "keycloak" ] && [ "$AUTH_VAULT_STATUS" = "active" ]; then
    log_success "Auth-Vault integration is ACTIVE"
else
    log_warning "Auth-Vault integration status: mode=$AUTH_MODE, status=$AUTH_VAULT_STATUS"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${GREEN}  NetViz Pro is now running with Auth-Vault!${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo ""
echo -e "  ${BLUE}NetViz Pro:${NC}"
echo -e "    Application:     http://localhost:$GATEWAY_PORT"
echo -e "    Auth Server:     http://localhost:$AUTH_SERVER_PORT/api/health"
echo ""
echo -e "  ${BLUE}Auth-Vault Services (native, shared by all apps):${NC}"
echo -e "    Keycloak Admin:  http://localhost:$KEYCLOAK_PORT/admin"
echo -e "    Vault UI:        http://localhost:$VAULT_PORT/ui"
echo -e "    Installation:    $AUTH_VAULT_DIR"
echo ""
echo -e "  ${YELLOW}Integration Status:${NC}"
echo -e "    Auth Mode:       $AUTH_MODE"
echo -e "    Auth-Vault:      $AUTH_VAULT_STATUS"
echo ""

# Show other running apps in summary
if [ ${#RUNNING_APPS[@]} -gt 0 ]; then
    echo -e "  ${GREEN}Other OSPF Apps Running (not affected):${NC}"
    for app in "${RUNNING_APPS[@]}"; do
        echo -e "    ✓ $app"
    done
    echo ""
fi

echo -e "  ${CYAN}Default Credentials:${NC}"
echo -e "    Keycloak Admin: admin / SecureAdm1n!2025"
echo -e "    NetViz Admin:   netviz_admin / (see .env.local)"
echo ""
echo -e "  ${YELLOW}Note:${NC} This script only manages NetViz Pro (ports 9040-9042)."
echo -e "        Other OSPF apps and Auth-Vault services are not affected."
echo ""
echo -e "${CYAN}=============================================================================${NC}"
