# Core Components Reference

The main structural components of NetViz Pro.

## App.tsx

**Location**: `/netviz-pro/App.tsx`

The root application component that manages global state and renders the layout.

### State Variables

```typescript
// Data state
originalData: NetworkData     // Unmodified topology
currentData: NetworkData      // Working copy (with overrides)

// Selection state
selectedNode: Node | null     // Currently selected node
selectedLink: Link | null     // Currently selected link

// Mode state
isSimulationMode: boolean     // Monitor vs Simulation mode
linkOverrides: Record<string, number>  // Cost overrides

// Theme
theme: 'dark' | 'light'       // UI theme

// Modal visibility (one for each modal)
showDijkstraVisualizer: boolean
showCapacityPlanningModal: boolean
// ... etc
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Header                                │
│  [Logo] [Mode Toggle] [Tool Buttons] [Upload]               │
├──────────┬────────────────────────────────┬─────────────────┤
│          │                                │                 │
│  File    │                                │   Details       │
│  Upload  │        NetworkGraph            │   Panel         │
│  Panel   │        (D3.js SVG)             │                 │
│          │                                │                 │
│          │                                │                 │
└──────────┴────────────────────────────────┴─────────────────┘
```

---

## NetworkGraph.tsx

**Location**: `/netviz-pro/components/NetworkGraph.tsx`

D3.js-powered force-directed graph visualization.

### Props

```typescript
interface NetworkGraphProps {
  nodes: Node[];
  links: Link[];
  onNodeClick: (node: Node) => void;
  onLinkClick: (link: Link) => void;
  selectedNode: Node | null;
  highlightedPath?: string[];  // Node IDs to highlight
  isSimulationMode: boolean;
}
```

### Features

- Force-directed layout (d3-force)
- Zoom and pan (d3-zoom)
- Node drag interaction
- Node coloring by country
- Link styling by status
- Path highlighting
- Responsive sizing

### Country Color Map

| Country | Color |
|---------|-------|
| USA | Blue |
| GBR | Red |
| DEU | Yellow |
| FRA | Cyan |
| JPN | Pink |
| AUS | Green |
| Other | Gray |

---

## FileUpload.tsx

**Location**: `/netviz-pro/components/FileUpload.tsx`

Handles JSON topology file upload and parsing.

### Props

```typescript
interface FileUploadProps {
  onDataLoaded: (data: NetworkData) => void;
  currentFileName?: string;
}
```

### Features

- File input with drag-and-drop
- JSON validation
- Error display
- File info display

### Parsing Process

```
User selects file
       │
       ▼
FileReader reads file as text
       │
       ▼
JSON.parse() converts to object
       │
       ▼
parseNetworkData() validates structure
       │
       ▼
onDataLoaded() callback with NetworkData
```

---

## NodeDetailsPanel.tsx

**Location**: `/netviz-pro/components/NodeDetailsPanel.tsx`

Displays details of the selected node.

### Props

```typescript
interface NodeDetailsPanelProps {
  node: Node | null;
  links: Link[];
  onClose: () => void;
}
```

### Displayed Information

- Node ID
- Label
- IP Address
- Country (with flag)
- Status
- Connected links count
- Adjacent nodes list

---

## LinkEditPanel.tsx

**Location**: `/netviz-pro/components/LinkEditPanel.tsx`

Allows editing link costs in simulation mode.

### Props

```typescript
interface LinkEditPanelProps {
  link: Link | null;
  originalCost: number;
  currentCost: number;
  onCostChange: (newCost: number) => void;
  onReset: () => void;
  onClose: () => void;
}
```

### Features

- Cost input field
- Reset to original
- Real-time update
- Visual feedback

---

## StatsDisplay

**Location**: Inline in `App.tsx`

Shows network statistics summary.

### Displayed Stats

- Node count
- Link count
- Country count
- Average link cost
- Critical utilization count (if traffic data)

---

## Legend Component

**Location**: Inline in `NetworkGraph.tsx`

Displays color legend for node countries.

### Layout

```
Legend
├── [●] USA
├── [●] GBR
├── [●] DEU
├── [●] FRA
└── [●] Other
```

---

## Common Patterns

### Event Handling

```typescript
// Node click
const handleNodeClick = (node: Node) => {
  setSelectedNode(node);
  setSelectedLink(null);
};

// Link click
const handleLinkClick = (link: Link) => {
  setSelectedLink(link);
  setSelectedNode(null);
};
```

### Data Derivation

```typescript
// Get current data with overrides applied
const currentData = useMemo(() => {
  if (!isSimulationMode || Object.keys(linkOverrides).length === 0) {
    return originalData;
  }
  return {
    ...originalData,
    links: originalData.links.map(link => ({
      ...link,
      cost: linkOverrides[`${link.source}-${link.target}`] ?? link.cost
    }))
  };
}, [originalData, isSimulationMode, linkOverrides]);
```
