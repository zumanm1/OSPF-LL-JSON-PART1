# Getting Started with NetViz Pro

NetViz Pro is an OSPF Network Topology Visualizer built with React 19, TypeScript, and D3.js.

## Quick Start

```bash
# Navigate to project directory
cd /Users/macbook/OSPF-LL-JSON/netviz-pro

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:9040**

## Documentation Index

| Document | Description |
|----------|-------------|
| [Installation](./INSTALLATION.md) | Detailed installation instructions |
| [Quick Start](./QUICKSTART.md) | 5-minute getting started guide |
| [Input Format](../input-format/README.md) | JSON topology file format |
| [Components](../components/README.md) | UI component reference |
| [Utilities](../utilities/README.md) | Utility function reference |
| [Troubleshooting](../guides/TROUBLESHOOTING.md) | Common issues and solutions |

## System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Memory**: 4GB RAM minimum (8GB recommended for large topologies)

## Project Structure

```
netviz-pro/
├── App.tsx              # Main application component
├── main.tsx             # React entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── components/          # React components
│   ├── NetworkGraph.tsx # D3 network visualization
│   ├── FileUpload.tsx   # File upload handler
│   └── [Modals]*.tsx    # Analysis modal components
├── utils/               # Utility functions
│   ├── parser.ts        # JSON file parser
│   └── graphAlgorithms.ts # Dijkstra, path finding
├── types.ts             # TypeScript interfaces
├── constants.ts         # App constants
└── docs/                # Documentation
```

## Next Steps

1. **Upload a topology file**: Use the file upload button to load a JSON topology
2. **Explore the graph**: Click and drag nodes, zoom with scroll
3. **Run analysis**: Use the toolbar buttons to access analysis tools

See [Quick Start](./QUICKSTART.md) for a complete walkthrough.
