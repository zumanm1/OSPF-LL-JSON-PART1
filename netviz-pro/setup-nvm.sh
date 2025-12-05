#!/bin/bash

################################################################################
# NetViz Pro - Node.js Environment Setup
# Installs nvm and configures isolated Node.js environment for this project
################################################################################

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Required versions
REQUIRED_NODE_VERSION="20"
NVM_VERSION="0.39.7"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NetViz Pro - Node.js Environment Setup                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ -f /etc/debian_version ]]; then
    OS="debian"
elif [[ -f /etc/redhat-release ]]; then
    OS="redhat"
fi
echo -e "  Detected OS: ${GREEN}$OS${NC}"
echo ""

# ============================================================================
# Step 1: Check/Install nvm
# ============================================================================
echo -e "${CYAN}[1/4] Checking nvm (Node Version Manager)...${NC}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

install_nvm() {
    echo -e "  ${YELLOW}Installing nvm v$NVM_VERSION...${NC}"
    
    # Download and install nvm
    curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh" | bash
    
    # Load nvm immediately
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    
    if command -v nvm &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} nvm installed successfully"
        return 0
    else
        echo -e "  ${RED}✗${NC} nvm installation failed"
        return 1
    fi
}

if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo -e "  ${GREEN}✓${NC} nvm already installed: $(nvm --version)"
else
    echo -e "  ${YELLOW}○${NC} nvm not found"
    read -p "  Install nvm now? (recommended) [Y/n]: " INSTALL_NVM
    INSTALL_NVM=${INSTALL_NVM:-Y}
    
    if [[ "$INSTALL_NVM" =~ ^[Yy]$ ]]; then
        install_nvm
    else
        echo -e "  ${YELLOW}⚠${NC} Skipping nvm installation"
        echo -e "  ${YELLOW}  ${NC} You can install manually: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash"
    fi
fi

echo ""

# ============================================================================
# Step 2: Install/Switch to required Node version
# ============================================================================
echo -e "${CYAN}[2/4] Setting up Node.js v$REQUIRED_NODE_VERSION...${NC}"

if command -v nvm &> /dev/null; then
    # Check if required version is installed
    if nvm ls "$REQUIRED_NODE_VERSION" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Node v$REQUIRED_NODE_VERSION already installed"
    else
        echo -e "  ${YELLOW}○${NC} Installing Node v$REQUIRED_NODE_VERSION..."
        nvm install "$REQUIRED_NODE_VERSION"
        echo -e "  ${GREEN}✓${NC} Node v$REQUIRED_NODE_VERSION installed"
    fi
    
    # Use the required version
    nvm use "$REQUIRED_NODE_VERSION"
    echo -e "  ${GREEN}✓${NC} Now using: $(node --version)"
    
    # Set as default for this project
    nvm alias netviz-pro "$REQUIRED_NODE_VERSION" 2>/dev/null || true
    
elif command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ] && [ "$NODE_MAJOR" -le 24 ]; then
        echo -e "  ${GREEN}✓${NC} Using system Node: $NODE_VERSION"
    else
        echo -e "  ${YELLOW}⚠${NC} System Node $NODE_VERSION may not be compatible"
        echo -e "  ${YELLOW}  ${NC} Recommended: v18-v24"
    fi
else
    echo -e "  ${RED}✗${NC} Node.js not found!"
    echo ""
    echo "  Please install Node.js manually:"
    if [ "$OS" == "macos" ]; then
        echo "    brew install node@20"
    elif [ "$OS" == "debian" ]; then
        echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "    sudo apt install -y nodejs"
    else
        echo "    Visit: https://nodejs.org/"
    fi
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Verify npm
# ============================================================================
echo -e "${CYAN}[3/4] Verifying npm...${NC}"

if command -v npm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} npm: $(npm --version)"
else
    echo -e "  ${RED}✗${NC} npm not found (should come with Node.js)"
    exit 1
fi

echo ""

# ============================================================================
# Step 4: Configure shell for auto-switching
# ============================================================================
echo -e "${CYAN}[4/4] Configuring shell integration...${NC}"

# Detect shell config file
SHELL_CONFIG=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
fi

if [ -n "$SHELL_CONFIG" ]; then
    # Check if auto-switch is already configured
    if grep -q "nvm use" "$SHELL_CONFIG" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Shell auto-switch already configured"
    else
        echo -e "  ${YELLOW}○${NC} Auto-switch not configured"
        echo -e "  ${CYAN}Tip:${NC} Add this to $SHELL_CONFIG for auto-switching:"
        echo ""
        echo '    # Auto-switch Node version when entering directory with .nvmrc'
        echo '    autoload -U add-zsh-hook 2>/dev/null'
        echo '    load-nvmrc() {'
        echo '      if [ -f .nvmrc ]; then'
        echo '        nvm use 2>/dev/null'
        echo '      fi'
        echo '    }'
        echo '    add-zsh-hook chpwd load-nvmrc 2>/dev/null'
        echo ""
    fi
else
    echo -e "  ${YELLOW}○${NC} Could not detect shell config file"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Node.js Environment Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Environment:${NC}"
echo "  • Node.js: $(node --version 2>/dev/null || echo 'not available')"
echo "  • npm: $(npm --version 2>/dev/null || echo 'not available')"
if command -v nvm &> /dev/null; then
    echo "  • nvm: $(nvm --version)"
fi
echo ""
echo -e "${CYAN}Project Isolation Files:${NC}"
echo "  • .nvmrc: Node v$REQUIRED_NODE_VERSION pinned"
echo "  • .node-version: Compatible with fnm/volta"
echo "  • package.json engines: Node 18-24, npm 9+"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Restart your terminal (or run: source ~/.zshrc)"
echo "  2. Run: ./netviz.sh deps"
echo "  3. Run: ./netviz.sh start"
echo ""
