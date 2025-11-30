#!/bin/bash

################################################################################
# NetViz Pro - Complete Installation with System Dependencies
# This script installs Node.js, npm, Python (if needed), and app dependencies
################################################################################

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Complete Installation Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
# 1. Check and Install Node.js
################################################################################

echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js already installed: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    
    if [ "$OS_TYPE" == "macOS" ]; then
        # Check for Homebrew
        if command -v brew &> /dev/null; then
            echo "Installing Node.js via Homebrew..."
            brew install node
        else
            echo -e "${RED}Homebrew not found. Please install from https://brew.sh${NC}"
            echo "Or install Node.js manually from https://nodejs.org"
            exit 1
        fi
    elif [ "$OS_TYPE" == "Linux" ]; then
        # Use NodeSource repository
        echo "Installing Node.js via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${RED}Unsupported OS. Please install Node.js manually from https://nodejs.org${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
fi

################################################################################
# 2. Check npm
################################################################################

echo ""
echo -e "${YELLOW}[2/5] Checking npm...${NC}"

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm already installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found (should come with Node.js)${NC}"
    exit 1
fi

################################################################################
# 3. Check Python (optional, for some build tools)
################################################################################

echo ""
echo -e "${YELLOW}[3/5] Checking Python...${NC}"

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
# 4. Install npm dependencies
################################################################################

echo ""
echo -e "${YELLOW}[4/5] Installing npm dependencies...${NC}"

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All npm dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install npm dependencies${NC}"
    exit 1
fi

################################################################################
# 5. Configure environment
################################################################################

echo ""
echo -e "${YELLOW}[5/5] Configuring environment...${NC}"

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
echo "Next Steps:"
echo "  1. Configure .env.local with secure credentials"
echo "  2. Run tests: npm test"
echo "  3. Start development server: ./start.sh"
echo "  4. Or use: npm run dev"
echo ""
echo "For more information, see:"
echo "  - IMPLEMENTATION_COMPLETE_2025-11-29.md"
echo "  - .env.local.example"
echo ""
