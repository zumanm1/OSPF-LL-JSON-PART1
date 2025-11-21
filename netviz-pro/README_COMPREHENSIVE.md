# 🌐 NetViz Pro - OSPF Network Topology Visualizer

<div align="center">

![NetViz Pro Banner](https://img.shields.io/badge/NetViz-Pro-blue?style=for-the-badge&logo=network&logoColor=white)

**Professional network topology visualization and analysis tool**

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![D3.js](https://img.shields.io/badge/D3.js-7.9.0-F9A03C?style=flat&logo=d3.js)](https://d3js.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)

[Features](#-features) •
[Quick Start](#-quick-start) •
[Documentation](#-documentation) •
[Testing](#-testing) •
[Contributing](#-contributing)

</div>

---

## 🎯 What is NetViz Pro?

NetViz Pro is a **modern, interactive web application** for visualizing and analyzing OSPF network topologies. Built for network engineers, architects, and operations teams, it provides powerful tools for understanding complex routing scenarios including **asymmetric routing**.

### Use Cases

- 📊 **Network Topology Visualization** - Interactive force-directed graphs of your OSPF network
- 🔍 **Path Analysis** - Calculate and visualize shortest paths with actual OSPF costs
- 🧪 **Simulation & What-If Analysis** - Test link failures and cost changes before implementation
- 📈 **Asymmetric Routing Detection** - Identify and analyze asymmetric routing paths
- 📁 **Data Import/Export** - Support for JSON topologies and PyATS logs

---

## ✨ Features

### Core Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **Interactive Visualization** | D3.js force-directed graph with zoom, pan, drag | ✅ Stable |
| **Monitor Mode** | Read-only topology viewing with detailed information | ✅ Stable |
| **Simulation Mode** | What-if analysis with cost/status modifications | ✅ Stable |
| **Asymmetric Routing** | Full support for forward_cost ≠ reverse_cost | ✅ Verified |
| **Path Analysis** | Dijkstra shortest path + multi-path DFS | ✅ Stable |
| **Cost Matrix** | All-pairs shortest path cost calculation | ✅ Stable |
| **Country Filtering** | Show/hide topology by geographic region | ✅ Stable |
| **localStorage Persistence** | State retention across browser sessions | ✅ Stable |
| **JSON Import/Export** | Standard topology file format support | ✅ Stable |
| **PyATS Log Parsing** | Parse CDP and OSPF data from network devices | ✅ Stable |

### Advanced Features

- 🔄 **Bidirectional Link Management** - Automatic detection and reverse cost calculation
- 🎨 **Country-Based Coloring** - Visual distinction for multi-region networks
- 📊 **Interface Label Toggle** - Show/hide interface names on links
- 💾 **Export Modified Topology** - Save simulation results as JSON
- 🗑️ **Clear Cache** - Reset to default state
- 🔍 **Link Cost Labels** - Toggle cost display on visualization

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Platform Support

✅ **Windows** - Full support with standard npm commands  
✅ **macOS** - Native support  
✅ **Linux** - Native support

### Installation

```bash
# Clone repository
cd netviz-pro

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:9040
```

### First Steps

1. **Explore Sample Data** - The app loads a 10-router topology automatically
2. **Click Nodes** - See router details (hostname, IP, interfaces)
3. **Click Links** - View link costs and interface information
4. **Try Simulation** - Toggle to Simulation mode and modify a link cost
5. **Analyze Paths** - Switch to Analysis tab and find shortest paths

---

## 📚 Documentation

### Quick Links

- 📖 **[Complete Documentation](./DOCUMENTATION.md)** - Full user guide and API reference
- 🐛 **[Bug Analysis Report](./CRITICAL_BUGS_ANALYSIS.md)** - Detailed technical analysis
- 🧪 **Test Scripts** - `verify_*.js` and `test_*.js` files

### Key Concepts

#### Monitor vs Simulation Mode

| Mode | Purpose | Can Edit? | Data State |
|------|---------|-----------|------------|
| **Monitor** | View actual topology | No | Read-only |
| **Simulation** | What-if analysis | Yes | Modified copy |

#### Asymmetric Routing

NetViz Pro fully supports asymmetric OSPF costs where:
```
Link R1 ↔ R2:
  Forward (R1→R2): cost = 100
  Reverse (R2→R1): cost = 500
```

This is common in scenarios like:
- Satellite links (upload ≠ download speed)
- Backup/primary path preferences
- Traffic engineering policies

---

## 🏗️ Architecture

### Tech Stack

```
┌─────────────────────────────────────┐
│      React 19.2 + TypeScript        │
├─────────────────────────────────────┤
│  D3.js      │  Lucide  │  Tailwind  │
│  (Viz)      │  (Icons) │  (Styles)  │
├─────────────────────────────────────┤
│        Vite Build Tool              │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
App.tsx (Main Container)
├── Header (Mode Toggle, Export, Clear Cache)
├── Sidebar
│   ├── FileUpload
│   ├── Network Stats
│   ├── Country Filter Legend
│   └── AnalysisSidebar
└── Main Visualization Area
    ├── NetworkGraph (D3.js Canvas)
    ├── DetailsPanel (Node Info)
    ├── LinkDetailsPanel (Monitor Mode)
    ├── LinkEditPanel (Simulation Mode)
    └── CostMatrixModal
```

### Data Flow

```
User Upload → Parser → Original Data
                             ↓
                     (stored in localStorage)
                             ↓
            Simulation Overrides Applied
                             ↓
                      Current Data
                             ↓
                D3.js Visualization + Path Analysis
```

---

## 📦 Data Formats

### JSON Topology Format

```json
{
  "nodes": [
    {
      "id": "R1",
      "hostname": "zim-r1",
      "loopback_ip": "172.16.1.1",
      "country": "ZIM",
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
      "reverse_cost": 150,
      "status": "up"
    }
  ],
  "metadata": {
    "data_source": "manual",
    "timestamp": "2025-11-20T12:00:00Z"
  }
}
```

### PyATS Log Format

```json
{
  "files": [
    {
      "filename": "router1.log",
      "content": "hostname zim-r1\nshow cdp neighbors detail\n..."
    },
    {
      "filename": "router2.log",
      "content": "hostname zim-r2\nshow cdp neighbors detail\n..."
    }
  ],
  "timestamp": "2025-11-20T12:00:00Z"
}
```

The parser extracts:
- Hostnames
- Loopback IPs
- CDP neighbors
- OSPF interface costs
- Interface names

---

## 🧪 Testing

### Running Tests

```bash
# Basic functionality
node verify_app.js

# localStorage persistence
node verify_persistence.js

# Simulation and export
node verify_simulation_export.js

# Asymmetric routing validation
node test_asymmetric_routing.js

# Run all tests at once
node verify_app.js && node verify_persistence.js && node verify_simulation_export.js && node test_asymmetric_routing.js
```

### Test Results

All tests pass successfully:

```
✅ verify_app.js           - Basic UI rendering and simulation toggle
✅ verify_persistence.js   - localStorage save/load/clear (comprehensive)
✅ verify_simulation_export.js - Link modification and JSON export
✅ test_asymmetric_routing.js - Asymmetric cost calculation
```

### Manual Testing

See [DOCUMENTATION.md](./DOCUMENTATION.md#-testing) for complete manual testing checklist.

---

## 🐛 Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| localStorage quota not monitored | 🟡 Medium | Planned | Clear cache if quota exceeded |
| Performance degrades beyond 200 nodes | 🟡 Medium | Investigating | Filter topology by country |
| No CSV export for cost matrix | 🟢 Low | Enhancement | Copy from modal table |

See [CRITICAL_BUGS_ANALYSIS.md](./CRITICAL_BUGS_ANALYSIS.md) for detailed technical analysis.

---

## 🔧 Development

### Project Structure

```
netviz-pro/
├── components/              # React components
│   ├── NetworkGraph.tsx     # D3 visualization
│   ├── AnalysisSidebar.tsx  # Path analysis UI
│   └── ...
├── utils/                   # Utilities
│   ├── graphAlgorithms.ts   # Dijkstra, DFS
│   └── parser.ts            # PyATS parser
├── hooks/                   # Custom hooks
│   └── useLocalStorage.ts   # Persistent state
├── types.ts                 # TypeScript interfaces
├── constants.ts             # Configuration
├── App.tsx                  # Main app
└── index.tsx                # Entry point
```

### Building

```bash
# Development build (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Adding Features

See [DOCUMENTATION.md](./DOCUMENTATION.md#-development) for detailed development guide.

---

## 🤝 Contributing

### Bug Reports

Submit issues with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS info
- Console errors

### Feature Requests

Propose features with:
- Use case description
- Mockups/wireframes (if applicable)
- Technical considerations

---

## 📈 Performance

### Tested Limits

| Metric | Limit | Performance |
|--------|-------|-------------|
| Nodes | < 100 | Excellent |
| Nodes | 100-200 | Good |
| Nodes | > 200 | Degrades |
| Links | < 500 | Excellent |
| Path Calculations | 50 paths | < 1 second |

### Optimization Tips

1. **Filter by Country** - Reduce visible nodes
2. **Limit Path Results** - Set to 10-20 instead of 50
3. **Stop Force Simulation** - Manually position nodes

---

## 🔐 Security

### Data Privacy

- ✅ All data processed **client-side** (no server)
- ✅ localStorage only (no external APIs)
- ✅ No telemetry or tracking
- ✅ No network calls except file uploads

### Recommendations

- 🔒 Use HTTPS in production
- 🔒 Sanitize user inputs before display
- 🔒 Regular dependency updates (`npm audit`)

---

## 📊 Roadmap

### Version 1.1 (Planned)

- [ ] CSV export for cost matrices
- [ ] localStorage quota monitoring
- [ ] Performance optimizations for large graphs
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle

### Version 2.0 (Future)

- [ ] Telnet/SSH live device connection
- [ ] Backend API with database
- [ ] Real-time topology updates
- [ ] Multi-user collaboration
- [ ] Historical topology comparison

---

## 📜 Changelog

### v1.0.0 (2025-11-20)

**Added:**
- ✅ Full asymmetric routing support
- ✅ localStorage persistence
- ✅ Comprehensive test suite
- ✅ PyATS log parser
- ✅ Cost matrix visualization
- ✅ Simulation mode
- ✅ Country-based filtering

**Fixed:**
- ✅ Graph algorithm asymmetric cost handling
- ✅ Link index tracking consistency
- ✅ Duplicate link detection
- ✅ State persistence across reloads

---

## 🙏 Acknowledgments

- **D3.js** - Mike Bostock and contributors
- **React** - Meta and community
- **Vite** - Evan You and team
- **Lucide Icons** - Lucide contributors

---

## 📄 License

**Proprietary - Internal Use Only**

© 2025 Network Visualization Team. All rights reserved.

---

## 📞 Support & Contact

- 📖 Documentation: [DOCUMENTATION.md](./DOCUMENTATION.md)
- 🐛 Bug Analysis: [CRITICAL_BUGS_ANALYSIS.md](./CRITICAL_BUGS_ANALYSIS.md)
- 🧪 Testing: Run `node verify_*.js` scripts

---

<div align="center">

**Built with ❤️ for Network Engineers**

[⬆ Back to Top](#-netviz-pro---ospf-network-topology-visualizer)

</div>
