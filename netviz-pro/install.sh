#!/bin/bash

################################################################################
# NetViz Pro - Quick Installation
# Supports isolated Node.js environments via nvm, volta, or fnm
################################################################################

set -e  # Exit on error

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Quick Installation"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Required Node version (from .nvmrc)
REQUIRED_NODE_VERSION="20"

# ============================================================================
# Load nvm if available and switch to project Node version
# ============================================================================
load_nvm() {
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
        
        if [ -f ".nvmrc" ]; then
            local REQUIRED=$(cat .nvmrc)
            local CURRENT=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
            
            if [ "$CURRENT" != "$REQUIRED" ]; then
                echo -e "  ${YELLOW}⚠${NC} Switching to Node $REQUIRED (project requirement)..."
                nvm use "$REQUIRED" 2>/dev/null || nvm install "$REQUIRED"
            fi
        fi
        return 0
    fi
    return 1
}

# ============================================================================
# Check prerequisites
# ============================================================================
echo -e "${CYAN}Checking Node.js environment...${NC}"
echo ""

# Try to load nvm first
if load_nvm; then
    echo -e "  ${GREEN}✓${NC} nvm detected - using project Node version"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found!${NC}"
    echo ""
    echo "Install options:"
    echo "  1. Install nvm (recommended for isolation):"
    echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "     nvm install 20"
    echo ""
    echo "  2. Or run: ./netviz.sh install"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found!${NC}"
    exit 1
fi

# Check Node version compatibility
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ] || [ "$NODE_MAJOR" -gt 24 ]; then
    echo -e "  ${YELLOW}⚠${NC} Node $NODE_VERSION detected. Recommended: v18-v24"
    echo -e "    For best results, use Node v$REQUIRED_NODE_VERSION (see .nvmrc)"
else
    echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VERSION"
fi

echo -e "  ${GREEN}✓${NC} npm: $(npm --version)"
echo ""

# Install dependencies (including production security packages)
echo "Installing base dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install base dependencies${NC}"
    exit 1
fi

echo "Installing production security packages..."
npm install helmet express-rate-limit --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install security packages${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Setup environment
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        echo "Creating .env.local from template..."
        cp .env.local.example .env.local
        echo -e "${YELLOW}⚠ IMPORTANT: Edit .env.local with your secure credentials!${NC}"
        echo ""
        echo "Required:"
        echo "  - APP_SECRET_KEY (32+ chars)"
        echo "  - ADMIN_RESET_PIN (8+ chars)"
        echo "  - APP_ADMIN_PASSWORD (12+ chars, complex)"
        echo ""
    fi
else
    echo -e "${GREEN}✓ .env.local exists${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Environment Isolation:${NC}"
echo "  • .nvmrc: Node v$REQUIRED_NODE_VERSION pinned"
echo "  • .node-version: Compatible with fnm/volta"
echo "  • package.json engines: Node 18-24, npm 9+"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Configure .env.local with secure credentials"
echo "  2. Start: ./start.sh or ./netviz.sh start"
echo ""
echo -e "${CYAN}Tip:${NC} Use 'nvm use' to switch to project Node version"
echo ""
