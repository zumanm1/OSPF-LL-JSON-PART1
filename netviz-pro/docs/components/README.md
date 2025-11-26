# Component Reference

NetViz Pro is built with React 19 components organized into categories.

## Component Categories

| Category | Description |
|----------|-------------|
| [Core Components](./CORE.md) | Main app structure |
| [Modal Components](./MODALS.md) | Analysis tool dialogs |
| [Panel Components](./PANELS.md) | Side panels and details |

## Component Overview

### Main Application

```
App.tsx
├── Header (toolbar)
├── FileUpload (left panel)
├── NetworkGraph (center)
├── NodeDetailsPanel (right)
├── LinkEditPanel (right, simulation mode)
└── [Modal Components] (overlay dialogs)
```

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| App | `App.tsx` | Main application container |
| NetworkGraph | `components/NetworkGraph.tsx` | D3.js graph visualization |
| FileUpload | `components/FileUpload.tsx` | JSON file upload handler |
| NodeDetailsPanel | `components/NodeDetailsPanel.tsx` | Node information display |
| LinkEditPanel | `components/LinkEditPanel.tsx` | Link cost editor (simulation) |

### Analysis Modals

| Component | File | Purpose |
|-----------|------|---------|
| DijkstraVisualizer | `components/DijkstraVisualizer.tsx` | Shortest path finder |
| FullCostMatrixModal | `components/FullCostMatrixModal.tsx` | Node-to-node cost matrix |
| TransitAnalyzerModal | `components/TransitAnalyzerModal.tsx` | Transit country analysis |
| WhatIfAnalysisModal | `components/WhatIfAnalysisModal.tsx` | Link failure simulation |
| CapacityPlanningModal | `components/CapacityPlanningModal.tsx` | Capacity dashboard |
| TrafficUtilizationMatrix | `components/TrafficUtilizationMatrix.tsx` | Country traffic matrix |
| PrePostTrafficModal | `components/PrePostTrafficModal.tsx` | Traffic comparison |
| NetworkHealthModal | `components/NetworkHealthModal.tsx` | Health score dashboard |
| RippleEffectModal | `components/RippleEffectModal.tsx` | Failure cascade analysis |
| CostOptimizerModal | `components/CostOptimizerModal.tsx` | Cost optimization suggestions |
| TrafficFlowModal | `components/TrafficFlowModal.tsx` | Traffic flow visualization |
| PairCountriesModal | `components/PairCountriesModal.tsx` | Country pair comparison |
| ImpactAnalysisModal | `components/ImpactAnalysisModal.tsx` | Link failure impact |

## Component Data Flow

```
FileUpload
    │
    ▼ (JSON parsed)
App.tsx (state: originalData, currentData)
    │
    ├──► NetworkGraph (nodes, links, callbacks)
    │
    ├──► NodeDetailsPanel (selectedNode)
    │
    └──► [Modals] (data, onClose)
```

## State Management

State is managed in `App.tsx`:

```typescript
// Core data
const [originalData, setOriginalData] = useState<NetworkData>({});
const [currentData, setCurrentData] = useState<NetworkData>({});

// Selection state
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [selectedLink, setSelectedLink] = useState<Link | null>(null);

// Modal visibility
const [showDijkstraVisualizer, setShowDijkstraVisualizer] = useState(false);
const [showCapacityPlanningModal, setShowCapacityPlanningModal] = useState(false);
// ... etc

// Simulation mode
const [isSimulationMode, setIsSimulationMode] = useState(false);
const [linkOverrides, setLinkOverrides] = useState<Record<string, number>>({});
```

## Common Props Pattern

Most modal components receive:

```typescript
interface ModalProps {
  isOpen: boolean;              // Visibility control
  onClose: () => void;          // Close callback
  data: NetworkData;            // Topology data
  selectedNode?: Node;          // Currently selected node (optional)
}
```

## Adding New Components

1. Create component file in `components/` directory
2. Add state variable in `App.tsx`
3. Add toolbar button with click handler
4. Add modal component to JSX render
5. Document in this reference

See individual component docs for detailed prop specifications.
