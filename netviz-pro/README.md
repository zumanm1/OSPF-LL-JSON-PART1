# NetViz Pro

**OSPF Network Topology Visualizer** - A powerful tool for visualizing and analyzing OSPF network topologies.

## Quick Start

```bash
cd /Users/macbook/OSPF-LL-JSON/netviz-pro
npm install
npm run dev
```

Open: **http://localhost:9040**

## Features

- Interactive D3.js force-directed graph visualization
- Dijkstra shortest path analysis
- Traffic utilization matrix (country-to-country)
- Capacity planning dashboard
- Transit country analysis
- What-if scenario simulation
- Network health assessment
- CSV export for all analysis tools

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started/README.md) | Quick start guide |
| [Installation](./docs/getting-started/INSTALLATION.md) | Detailed setup |
| [Input Format](./docs/input-format/README.md) | JSON file specification |
| [Components](./docs/components/README.md) | UI component reference |
| [Utilities](./docs/utilities/README.md) | API function reference |
| [Troubleshooting](./docs/guides/TROUBLESHOOTING.md) | Common issues |
| [Quick Reference](./docs/guides/QUICK_REFERENCE.md) | Cheat sheet |

## System Requirements

- Node.js v18.0.0+
- npm v9.0.0+
- Modern browser (Chrome, Firefox, Safari, Edge)

## Tech Stack

- React 19
- TypeScript
- D3.js v7
- Vite
- Tailwind CSS
- Lucide Icons

## Project Structure

```
netviz-pro/
├── App.tsx                 # Main application
├── components/             # React components
│   ├── NetworkGraph.tsx    # D3 visualization
│   ├── FileUpload.tsx      # File handler
│   └── *Modal.tsx          # Analysis modals
├── utils/                  # Utilities
│   ├── parser.ts           # JSON parser
│   └── graphAlgorithms.ts  # Dijkstra, paths
├── types.ts                # TypeScript interfaces
├── docs/                   # Documentation
│   ├── getting-started/
│   ├── input-format/
│   ├── components/
│   ├── utilities/
│   └── guides/
└── validation_screenshots/ # Test screenshots
```

## Input File Format

Minimum required:
```json
{
  "nodes": [
    {"id": "R1", "label": "Router1", "country": "USA"}
  ],
  "links": [
    {"source": "R1", "target": "R2", "cost": 10}
  ]
}
```

See [Input Format Documentation](./docs/input-format/README.md) for complete specification.

## Testing

```bash
# Run validation tests
node final_validation.cjs
```

## Test Data

A complete test topology is available:
```
/Users/macbook/OSPF-LL-JSON/input-file-TX.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |

## License

MIT
