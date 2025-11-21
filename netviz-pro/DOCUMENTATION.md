# 📘 NetViz Pro - Complete Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Author:** Network Visualization Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [User Guide](#user-guide)
6. [API Reference](#api-reference)
7. [Data Formats](#data-formats)
8. [Development](#development)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🌟 Overview

**NetViz Pro** is a professional network topology visualization tool designed for network engineers, architects, and operations teams. It provides real-time visualization of OSPF network topologies with advanced path analysis and simulation capabilities.

### Purpose

- **Visualize** complex OSPF network topologies
- **Analyze** routing paths and costs
- **Simulate** link failures and cost changes
- **Export** modified topologies for planning
- **Understand** asymmetric routing scenarios

### Key Capabilities

- ✅ Interactive D3.js-powered graph visualization
- ✅ OSPF link cost display and modification
- ✅ Shortest path calculation (Dijkstra's algorithm)
- ✅ Asymmetric routing support
- ✅ Country-based topology filtering
- ✅ PyATS log parsing
- ✅ JSON import/export
- ✅ localStorage persistence
- ✅ Simulation mode for what-if analysis

---

## 🎯 Features

### 1. Monitor Mode (Read-Only)

- **Topology Visualization**: Interactive force-directed graph
- **Node Details**: View router information (hostname, IP, interfaces)
- **Link Details**: See interface names, costs, status
- **Path Analysis**: Calculate shortest paths between routers
- **Cost Matrix**: View all-pairs shortest path costs
- **Filtering**: Show/hide topology by country

### 2. Simulation Mode (What-If Analysis)

- **Link Cost Modification**: Change OSPF costs
- **Asymmetric Costs**: Set different forward/reverse costs
- **Link Shutdown**: Simulate interface down scenarios
- **Real-time Updates**: See path recalculation immediately
- **Persistent State**: Changes saved across sessions
- **Export**: Save modified topology as JSON

### 3. Analysis Tools

- **Shortest Path Finder**: Find optimal routes between nodes
- **Multi-Path Display**: Show top N alternative paths
- **Cost Matrix**: Calculate all-pairs shortest paths
- **Asymmetric Detection**: Identify asymmetric routing
- **Hop Count Analysis**: Compare path lengths

### 4. Data Import

- **JSON Topology Files**: Standard network graph format
- **PyATS Logs**: Parse CDP neighbor and OSPF cost data
- **Sample Data**: Included 10-router example topology

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19.2.0 + TypeScript 5.8.2 |
| **Visualization** | D3.js 7.9.0 (force-directed graphs) |
| **Build Tool** | Vite 6.2.0 |
| **Styling** | Tailwind CSS (CDN) |
| **Icons** | Lucide React 0.554.0 |
| **Testing** | Puppeteer 24.30.0 |
| **State Management** | React hooks + localStorage |

### Component Structure

```
netviz-pro/
├── App.tsx                 # Main application container
├── components/
│   ├── NetworkGraph.tsx    # D3 force-directed graph
│   ├── FileUpload.tsx      # JSON/PyATS file importer
│   ├── DetailsPanel.tsx    # Node information panel
│   ├── LinkDetailsPanel.tsx # Link info (Monitor mode)
│   ├── LinkEditPanel.tsx   # Link editor (Simulation mode)
│   ├── AnalysisSidebar.tsx # Path analysis interface
│   └── CostMatrixModal.tsx # All-pairs cost matrix
├── utils/
│   ├── graphAlgorithms.ts  # Dijkstra, DFS path finding
│   └── parser.ts           # PyATS log parser
├── hooks/
│   └── useLocalStorage.ts  # Persistent state hook
├── types.ts                # TypeScript interfaces
├── constants.ts            # Configuration constants
└── vite.config.ts          # Build configuration
```

### State Management

**Persisted State (localStorage):**
- `netviz_original_data`: Original topology data
- `netviz_link_overrides`: Simulation modifications
- `netviz_active_countries`: Country filter state
- `netviz_simulation_mode`: Current mode (monitor/simulation)

**Ephemeral State (React):**
- Selected node/link
- Active tab (details/analysis)
- Highlighted paths
- Modal visibility

### Data Flow

```
User Action → State Update → Derived Data Calculation → UI Re-render
     ↓                           ↓
localStorage ←─────────────── currentData (with overrides)
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0

### Steps

```bash
# 1. Navigate to project directory
cd netviz-pro

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# Navigate to http://localhost:9040
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📖 User Guide

### Getting Started

1. **Launch Application**: Open http://localhost:9040
2. **Initial View**: Sample 10-router topology loads automatically
3. **Explore**: Click nodes/links to see details
4. **Filter**: Toggle countries in sidebar to hide/show regions

### Importing Topology Data

#### JSON Format

```json
{
  "nodes": [
    {
      "id": "R1",
      "name": "R1",
      "hostname": "zim-r1",
      "loopback_ip": "172.16.1.1",
      "country": "ZIM",
      "port": 5000,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router"
    }
  ],
  "links": [
    {
      "source": "R1",
      "target": "R2",
      "source_interface": "Fa0/1",
      "target_interface": "Fa0/1",
      "cost": 100,
      "reverse_cost": 100,
      "status": "up"
    }
  ]
}
```

**Steps:**
1. Click "Click to upload" in sidebar
2. Select JSON file
3. Topology loads automatically

#### PyATS Format

PyATS logs must contain:
- `hostname` commands
- `show cdp neighbors detail` output
- `show ip ospf interface` output

**Steps:**
1. Collect logs from all routers
2. Combine into JSON with structure:
```json
{
  "files": [
    {
      "filename": "router1.log",
      "content": "hostname router1\n..."
    }
  ]
}
```
3. Upload JSON file

### Using Simulation Mode

#### Basic Workflow

1. **Activate Simulation Mode**
   - Click "Simulation" toggle in header
   - Purple banner appears

2. **Modify Link**
   - Click any link in graph
   - Edit panel appears (bottom-right)
   - Modify forward cost
   - Modify reverse cost
   - Change status (UP/DOWN)
   - Click "Apply Changes"

3. **View Pending Changes**
   - Sidebar shows "Pending Changes" section
   - Lists all modified links
   - Modified links shown in purple on graph

4. **Analyze Impact**
   - Switch to "Analysis" tab
   - Calculate paths with new costs
   - Compare results

5. **Export or Reset**
   - Export: Click download icon (header)
   - Reset: Click "Reset Simulation" button

#### Asymmetric Routing

To simulate asymmetric routing:

1. Select a link
2. Set **Forward Cost** = 10 (cheap)
3. Set **Reverse Cost** = 1000 (expensive)
4. Apply changes
5. In Analysis tab:
   - Calculate path A → B (uses cost=10)
   - Calculate path B → A (uses cost=1000)
   - Compare results

### Path Analysis

#### Finding Shortest Path

1. Switch to "Analysis" tab
2. **Source Selection**:
   - Select country (optional)
   - Select specific node (optional)
3. **Destination Selection**:
   - Select country (optional)
   - Select specific node (optional)
4. Click "Find Path" (specific) or "Find All" (all pairs)
5. Results show sorted by cost

#### Using Cost Matrix

1. In Analysis tab, select:
   - Source country
   - Destination country
2. Click "Matrix" button
3. Modal shows all-pairs costs
4. ∞ indicates no path exists

### Country Filtering

1. Scroll to "Filter Legend" in sidebar
2. Click country button to toggle visibility
3. Graph updates to show/hide nodes and links
4. "Select All" / "Deselect All" toggle

### Keyboard & Mouse Controls

| Action | Control |
|--------|---------|
| **Pan** | Click + Drag on background |
| **Zoom** | Mouse wheel / Pinch |
| **Select Node** | Click node circle |
| **Select Link** | Click link line |
| **Drag Node** | Click + Drag node (temporarily pins position) |
| **Close Panel** | Click X button or click background |

---

## 🔌 API Reference

### Graph Algorithms

#### `findShortestPathCost(nodes, links, startNodeId, endNodeId)`

Calculates shortest path cost using Dijkstra's algorithm.

**Parameters:**
- `nodes`: Array of NetworkNode objects
- `links`: Array of NetworkLink objects
- `startNodeId`: Source node ID (string)
- `endNodeId`: Destination node ID (string)

**Returns:** `number` - Total cost (Infinity if no path)

**Example:**
```typescript
import { findShortestPathCost } from './utils/graphAlgorithms';

const cost = findShortestPathCost(
  data.nodes,
  data.links,
  'R1',
  'R5'
);
console.log(`Shortest path cost: ${cost}`);
```

#### `findAllPaths(nodes, links, startNodeId, endNodeId, limit)`

Finds multiple paths using depth-first search.

**Parameters:**
- `nodes`: Array of NetworkNode objects
- `links`: Array of NetworkLink objects
- `startNodeId`: Source node ID
- `endNodeId`: Destination node ID
- `limit`: Maximum number of paths (default: 50)

**Returns:** `PathResult[]` - Array of paths sorted by cost

**Example:**
```typescript
const paths = findAllPaths(data.nodes, data.links, 'R1', 'R5', 10);
paths.forEach((path, idx) => {
  console.log(`Path ${idx + 1}: ${path.nodes.join(' -> ')} (cost: ${path.totalCost})`);
});
```

### Data Parser

#### `parsePyATSData(rawData)`

Parses PyATS log files into NetworkData format.

**Parameters:**
- `rawData`: Object with `files` array containing log contents

**Returns:** `NetworkData` - Parsed topology

**Example:**
```typescript
import { parsePyATSData } from './utils/parser';

const rawData = {
  files: [
    { filename: 'r1.log', content: '...' },
    { filename: 'r2.log', content: '...' }
  ],
  timestamp: new Date().toISOString()
};

const topology = parsePyATSData(rawData);
console.log(`Parsed ${topology.nodes.length} nodes`);
```

### Custom Hook

#### `useLocalStorage<T>(key, initialValue)`

React hook for persistent state.

**Parameters:**
- `key`: localStorage key (string)
- `initialValue`: Default value if not in storage

**Returns:** `[value, setValue]` - Similar to useState

**Example:**
```typescript
const [data, setData] = useLocalStorage('my_data', { count: 0 });

// Read
console.log(data.count);

// Write (auto-persists to localStorage)
setData({ count: data.count + 1 });
```

---

## 📦 Data Formats

### NetworkNode Interface

```typescript
interface NetworkNode {
  id: string;                // Unique identifier
  name: string;              // Display name
  hostname: string;          // Router hostname
  loopback_ip: string;       // Loopback IP address
  country: string;           // Country code (ZIM, USA, etc.)
  port?: number;             // Management port
  neighbor_count?: number;   // Number of neighbors
  is_active: boolean;        // Active status
  node_type: string;         // "router", "switch", etc.

  // D3 simulation properties (auto-generated)
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
```

### NetworkLink Interface

```typescript
interface NetworkLink {
  source: string | NetworkNode;      // Source node ID or object
  target: string | NetworkNode;      // Target node ID or object
  source_interface: string;          // Local interface name
  target_interface: string;          // Remote interface name
  cost: number;                      // Forward direction cost
  reverse_cost?: number;             // Reverse direction cost (optional)
  status: string;                    // "up" or "down"
  edge_type?: string;                // Link type
  index?: number;                    // Array index (for tracking)

  // Simulation properties (auto-generated)
  original_cost?: number;            // Pre-simulation cost
  original_status?: string;          // Pre-simulation status
  is_modified?: boolean;             // Modified flag
}
```

### PathResult Interface

```typescript
interface PathResult {
  id: string;              // Unique path ID
  nodes: string[];         // Array of node IDs in order
  links: number[];         // Array of link indices
  totalCost: number;       // Cumulative cost
  hopCount: number;        // Number of hops (nodes - 1)
}
```

---

## 🛠️ Development

### Project Setup

```bash
# Clone repository
git clone <repository-url>
cd netviz-pro

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

### Adding New Features

#### Adding a New Component

1. Create component file in `components/`:
```typescript
import React from 'react';

interface MyComponentProps {
  data: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ data }) => {
  return <div>{data}</div>;
};

export default MyComponent;
```

2. Import in `App.tsx`:
```typescript
import MyComponent from './components/MyComponent';
```

3. Use in render:
```typescript
<MyComponent data="Hello" />
```

#### Adding New Graph Algorithm

1. Add function to `utils/graphAlgorithms.ts`:
```typescript
export const myAlgorithm = (
  nodes: NetworkNode[],
  links: NetworkLink[]
): Result => {
  // Implementation
  return result;
};
```

2. Import and use:
```typescript
import { myAlgorithm } from './utils/graphAlgorithms';
const result = myAlgorithm(data.nodes, data.links);
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Absolute paths preferred
- **Comments**: JSDoc for public APIs
- **Formatting**: 2-space indentation

### Performance Optimization

**For Large Topologies (> 100 nodes):**

1. **Limit Force Simulation Iterations**:
```typescript
simulation.alpha(0.3).alphaDecay(0.05).restart();
```

2. **Reduce Path Search Limit**:
```typescript
findAllPaths(nodes, links, start, end, 10); // Limit to 10 paths
```

3. **Use React.memo** for expensive components:
```typescript
export default React.memo(MyComponent);
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
node verify_app.js
node verify_persistence.js
node verify_simulation_export.js
node test_asymmetric_routing.js
```

### Test Coverage

| Test Suite | Coverage |
|------------|----------|
| **Basic UI** | ✅ Rendering, mode toggle, panels |
| **Persistence** | ✅ localStorage save/load/clear |
| **Simulation** | ✅ Link editing, export, asymmetric costs |
| **Asymmetric Routing** | ✅ Forward/reverse path differences |

### Writing New Tests

```javascript
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto('http://localhost:9040');

  // Your test logic here
  const title = await page.title();
  console.assert(title === 'NetViz Pro', 'Title mismatch');

  await browser.close();
})();
```

### Manual Testing Checklist

- [ ] Upload JSON topology
- [ ] Upload PyATS logs
- [ ] Switch Monitor ↔ Simulation modes
- [ ] Modify link costs
- [ ] Simulate link down
- [ ] Calculate paths
- [ ] View cost matrix
- [ ] Toggle country filters
- [ ] Export topology
- [ ] Clear cache
- [ ] Reload page (test persistence)

---

## ⚠️ Troubleshooting

### Common Issues

#### 1. "Page Not Found" Error

**Symptom**: Cannot access http://localhost:9040

**Solution**:
```bash
# Check if server is running
ps aux | grep vite

# Restart server
npm run dev
```

#### 2. localStorage Quota Exceeded

**Symptom**: Console error "QuotaExceededError"

**Solution**:
- Clear browser cache
- Click "Clear Cached Data" button (Trash icon in header)
- Use smaller topology (< 500 nodes)

#### 3. Slow Performance with Large Graphs

**Symptom**: Laggy UI, high CPU usage

**Solution**:
```typescript
// In NetworkGraph.tsx, adjust simulation:
.force("charge", d3.forceManyBody().strength(-200))  // Reduce from -400
.alphaDecay(0.1);  // Increase from default (faster convergence)
```

#### 4. Paths Not Found

**Symptom**: Analysis shows "No paths calculated"

**Solution**:
- Ensure source and destination are in same connected component
- Check if any links are "down"
- Verify nodes exist in topology
- Check console for errors

#### 5. PyATS Import Failed

**Symptom**: "Invalid JSON structure" error

**Solution**:
- Verify JSON structure has `files` array
- Ensure logs contain CDP neighbor output
- Check for OSPF cost data in logs

### Debugging

**Enable Verbose Logging**:
```typescript
// In App.tsx, add:
useEffect(() => {
  console.log('Current Data:', currentData);
  console.log('Link Overrides:', linkOverrides);
}, [currentData, linkOverrides]);
```

**Check localStorage**:
```javascript
// In browser console:
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('netviz_')) {
    console.log(key, localStorage.getItem(key).length, 'bytes');
  }
});
```

---

## 📝 Changelog

### Version 1.0.0 (2025-11-20)

**Added:**
- ✅ Asymmetric routing support (forward_cost ≠ reverse_cost)
- ✅ localStorage persistence for all state
- ✅ Cost matrix export
- ✅ PyATS log parser with bidirectional link handling
- ✅ Comprehensive Puppeteer test suite

**Fixed:**
- ✅ Graph algorithm now correctly handles asymmetric costs
- ✅ Link index tracking consistency
- ✅ Duplicate link detection in PyATS parser
- ✅ State persistence across page reloads

**Known Issues:**
- ⚠️ localStorage quota not monitored (fix pending)
- ⚠️ No CSV export for cost matrix (enhancement pending)
- ⚠️ Performance degrades beyond 200 nodes (optimization needed)

---

## 🤝 Contributing

### Bug Reports

Submit issues with:
- Description of problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Console errors (if any)

### Feature Requests

Propose features with:
- Use case description
- Proposed UI/UX
- Technical considerations

---

## 📄 License

**Proprietary - Internal Use Only**

© 2025 Network Visualization Team. All rights reserved.

---

## 📞 Support

- **Documentation**: This file
- **Bug Analysis**: See `CRITICAL_BUGS_ANALYSIS.md`
- **Testing**: See `verify_*.js` files

---

*End of Documentation*
