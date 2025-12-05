#!/bin/bash

################################################################################
# NetViz Pro - Complete Installation with System Dependencies
# This script installs Node.js, npm, Python (if needed), and app dependencies
# Supports isolated Node.js environments via nvm, volta, or fnm
################################################################################

set -e  # Exit on error

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Complete Installation Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Required Node version (from .nvmrc)
REQUIRED_NODE_VERSION="20"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Darwin*)    OS_TYPE="macOS";;
    Linux*)     OS_TYPE="Linux";;
    *)          OS_TYPE="Unknown";;
esac

echo -e "${BLUE}Detected OS: $OS_TYPE${NC}"
echo ""

################################################################################
# 1. Check for nvm (Node Version Manager)
################################################################################

echo -e "${YELLOW}[1/6] Checking version managers...${NC}"

NVM_AVAILABLE=0
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    NVM_AVAILABLE=1
    echo -e "${GREEN}✓ nvm installed (Node version manager)${NC}"
else
    echo -e "${YELLOW}○ nvm not installed (optional but recommended for isolation)${NC}"
    echo -e "  ${CYAN}Install with:${NC} curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
fi

################################################################################
# 2. Check and Install Node.js
################################################################################

echo ""
echo -e "${YELLOW}[2/6] Checking Node.js...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    
    # If nvm available and wrong version, switch
    if [ $NVM_AVAILABLE -eq 1 ] && [ "$NODE_MAJOR" != "$REQUIRED_NODE_VERSION" ]; then
        echo -e "${YELLOW}⚠ Node $NODE_VERSION detected, project requires v$REQUIRED_NODE_VERSION${NC}"
        echo "  Installing/switching to Node $REQUIRED_NODE_VERSION via nvm..."
        nvm install $REQUIRED_NODE_VERSION 2>/dev/null
        nvm use $REQUIRED_NODE_VERSION 2>/dev/null
        echo -e "${GREEN}✓ Now using Node $(node --version)${NC}"
    else
        echo -e "${GREEN}✓ Node.js already installed: $NODE_VERSION${NC}"
    fi
else
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    
    # Prefer nvm if available
    if [ $NVM_AVAILABLE -eq 1 ]; then
        echo "  Installing Node $REQUIRED_NODE_VERSION via nvm..."
        nvm install $REQUIRED_NODE_VERSION
        nvm use $REQUIRED_NODE_VERSION
    elif [ "$OS_TYPE" == "macOS" ]; then
        # Check for Homebrew
        if command -v brew &> /dev/null; then
            echo "Installing Node.js via Homebrew..."
            brew install node@20
        else
            echo -e "${RED}Homebrew not found. Please install from https://brew.sh${NC}"
            echo "Or install Node.js manually from https://nodejs.org"
            exit 1
        fi
    elif [ "$OS_TYPE" == "Linux" ]; then
        # Use NodeSource repository
        echo "Installing Node.js via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${RED}Unsupported OS. Please install Node.js manually from https://nodejs.org${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
fi

################################################################################
# 3. Check npm
################################################################################

echo ""
echo -e "${YELLOW}[3/6] Checking npm...${NC}"

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm already installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found (should come with Node.js)${NC}"
    exit 1
fi

################################################################################
# 4. Check Python (optional, for some build tools)
################################################################################

echo ""
echo -e "${YELLOW}[4/6] Checking Python...${NC}"

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python3 already installed: $PYTHON_VERSION${NC}"
else
    echo -e "${YELLOW}Python3 not found (optional, but recommended)${NC}"
    
    if [ "$OS_TYPE" == "macOS" ]; then
        if command -v brew &> /dev/null; then
            echo "Installing Python3 via Homebrew..."
            brew install python3
        fi
    elif [ "$OS_TYPE" == "Linux" ]; then
        echo "Installing Python3..."
        sudo apt-get install -y python3 python3-pip
    fi
    
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}✓ Python3 installed: $(python3 --version)${NC}"
    else
        echo -e "${YELLOW}⚠ Python3 installation skipped (not critical)${NC}"
    fi
fi

################################################################################
# 5. Install npm dependencies
################################################################################

echo ""
echo -e "${YELLOW}[5/6] Installing npm dependencies...${NC}"

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All npm dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install npm dependencies${NC}"
    exit 1
fi

################################################################################
# 6. Configure environment
################################################################################

echo ""
echo -e "${YELLOW}[6/6] Configuring environment...${NC}"

if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        echo "Creating .env.local from template..."
        cp .env.local.example .env.local
        echo -e "${YELLOW}⚠ IMPORTANT: Edit .env.local with your secure credentials!${NC}"
        echo ""
        echo "Required settings:"
        echo "  - APP_SECRET_KEY (32+ characters)"
        echo "  - ADMIN_RESET_PIN (8+ characters, not common)"
        echo "  - APP_ADMIN_PASSWORD (12+ characters, complex)"
        echo ""
        echo -e "${RED}The server will NOT start without proper configuration!${NC}"
    else
        echo -e "${YELLOW}⚠ No .env.local.example found. You'll need to create .env.local manually.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

################################################################################
# Summary
################################################################################

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "System Dependencies:"
echo "  ✓ Node.js: $(node --version)"
echo "  ✓ npm: $(npm --version)"
if command -v python3 &> /dev/null; then
    echo "  ✓ Python3: $(python3 --version)"
fi
echo ""
echo -e "${CYAN}Environment Isolation:${NC}"
echo "  • .nvmrc: Node v$REQUIRED_NODE_VERSION pinned"
echo "  • .node-version: Compatible with fnm/volta"
echo "  • package.json engines: Node 18-24, npm 9+"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Configure .env.local with secure credentials"
echo "  2. Start development server: ./start.sh or ./netviz.sh start"
echo ""
echo -e "${CYAN}Tip:${NC} Use 'nvm use' to switch to project Node version"
echo ""
