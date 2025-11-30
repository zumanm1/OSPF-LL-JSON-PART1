#!/bin/bash

################################################################################
# NetViz Pro - Quick Installation (assumes Node.js/npm already installed)
################################################################################

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "  NetViz Pro - Quick Installation"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found!${NC}"
    echo "Please run ./install-with-deps.sh instead, or install Node.js manually."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
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
echo "Next Steps:"
echo "  1. Configure .env.local"
echo "  2. Run tests: npm test"
echo "  3. Start: ./start.sh or npm run dev"
echo ""
