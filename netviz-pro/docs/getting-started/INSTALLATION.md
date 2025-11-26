# Installation Guide

## Prerequisites

### Required Software

1. **Node.js** (v18.0.0+)
   ```bash
   # Check version
   node --version

   # Install via Homebrew (macOS)
   brew install node

   # Or download from https://nodejs.org
   ```

2. **npm** (v9.0.0+) - comes with Node.js
   ```bash
   npm --version
   ```

### Optional Tools

- **Git** - for version control
- **VS Code** - recommended editor with TypeScript support

## Installation Steps

### Step 1: Clone or Download

```bash
# If using git
git clone <repository-url>
cd netviz-pro

# Or navigate to existing directory
cd /Users/macbook/OSPF-LL-JSON/netviz-pro
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- React 19 + React DOM
- D3.js v7 (visualization)
- Lucide React (icons)
- TypeScript
- Vite (build tool)
- Tailwind CSS

### Step 3: Start Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v6.x.x  ready in XXX ms

  ➜  Local:   http://localhost:9040/
  ➜  Network: http://192.168.x.x:9040/
```

### Step 4: Access the Application

Open your browser to: **http://localhost:9040**

## Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

Production files are output to `dist/` directory.

## Configuration

### Port Configuration

Default port is **9040**. To change, edit `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 9040,  // Change this
    host: true
  }
})
```

### Environment Variables

No environment variables are required for basic operation.

## Troubleshooting Installation

### Error: EACCES permission denied

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Error: Node version mismatch

```bash
# Install nvm and use correct version
nvm install 18
nvm use 18
```

### Error: Port already in use

```bash
# Kill process on port 9040
lsof -ti:9040 | xargs kill -9
```

### Puppeteer (for testing)

If running E2E tests:
```bash
npm install puppeteer
```

## Verifying Installation

After starting the server, you should see:
1. A dark-themed interface with "NetViz Pro" header
2. File upload button in the left panel
3. Empty graph area in the center
4. Stats panel showing "0 nodes, 0 links"

Upload a test topology file to verify full functionality.
