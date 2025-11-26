# Modal Components Reference

Analysis tool modals that overlay the main interface.

## Modal List

| Modal | Button | Description |
|-------|--------|-------------|
| DijkstraVisualizer | Dijkstra | Find shortest paths |
| FullCostMatrixModal | Matrix | View cost matrix |
| TransitAnalyzerModal | Transit | Analyze transit countries |
| WhatIfAnalysisModal | What-If | Simulate changes |
| CapacityPlanningModal | Capacity | Capacity dashboard |
| TrafficUtilizationMatrix | Util Matrix | Traffic heatmap |
| NetworkHealthModal | Health | Health metrics |
| RippleEffectModal | Ripple | Failure cascades |
| CostOptimizerModal | Optimizer | Cost suggestions |
| TrafficFlowModal | Traffic | Flow analysis |
| PairCountriesModal | Pair | Country pairs |
| ImpactAnalysisModal | Impact | Impact analysis |

---

## DijkstraVisualizer

**Purpose**: Find shortest paths between nodes using Dijkstra's algorithm.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Source/destination node selection
- Path visualization on graph
- Step-by-step algorithm view
- Total path cost display

---

## FullCostMatrixModal

**Purpose**: Display NxN matrix of shortest path costs.

**Required Data**:
- `nodes[]` with `id`, `label`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Sortable matrix
- Highlight selected cell
- Export to CSV

---

## TransitAnalyzerModal

**Purpose**: Identify countries that serve as transit points.

**Required Data**:
- `nodes[]` with `id`, `country`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Transit country ranking
- Path count per country
- Filter by source/destination
- Percentage breakdown

---

## WhatIfAnalysisModal

**Purpose**: Simulate link failures and cost changes.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Disable specific links
- Modify link costs
- Compare before/after paths
- Impact summary

---

## CapacityPlanningModal

**Purpose**: Dashboard for capacity planning metrics.

**Required Data**:
- `links[]` with:
  - `source`, `target`
  - `capacity` (required)
  - `traffic` (required)
  - `utilization` (required)
  - `interface` (optional)
  - `interface_type` (optional)

**Features**:
- Critical/high/medium utilization counts
- Total capacity summary
- Sortable link table
- Utilization bars
- Export to CSV

**Utilization Thresholds**:
- Critical: >90%
- High: 70-90%
- Medium: 50-70%
- Low: <50%

---

## TrafficUtilizationMatrix

**Purpose**: Country-to-country traffic utilization heatmap.

**Required Data**:
- `nodes[]` with `id`, `country`
- `links[]` with `source`, `target`, `cost`, `utilization`

**Features**:
- Color-coded matrix cells
- Snapshot comparison (current vs historical)
- Upload custom snapshots
- Utilization legend

**Color Coding**:
- Green: <60% utilization
- Yellow: 60-70%
- Orange: 70-90%
- Red: >90%

---

## NetworkHealthModal

**Purpose**: Overall network health assessment.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`
- `links[]` with `capacity`, `utilization` (for capacity health)

**Health Categories**:
- Connectivity Score
- Redundancy Score
- Capacity Score
- Overall Health Grade

---

## RippleEffectModal

**Purpose**: Visualize cascade effects of failures.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Select link to fail
- Show affected paths
- Cascading impact visualization
- Recovery suggestions

---

## CostOptimizerModal

**Purpose**: Suggest optimal OSPF cost configurations.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`, `capacity`

**Features**:
- Cost optimization recommendations
- Load balancing suggestions
- Before/after comparison

---

## TrafficFlowModal

**Purpose**: Visualize traffic flows through the network.

**Required Data**:
- `nodes[]` with `id`, `country`
- `links[]` with `source`, `target`, `traffic`

**Features**:
- Flow diagram
- Bandwidth distribution
- Bottleneck identification

---

## PairCountriesModal

**Purpose**: Compare paths between country pairs.

**Required Data**:
- `nodes[]` with `id`, `country`
- `links[]` with `source`, `target`, `cost`

**Features**:
- Country pair selection
- All paths enumeration
- Cost comparison

---

## ImpactAnalysisModal

**Purpose**: Analyze impact of link changes.

**Required Data**:
- `nodes[]` with `id`
- `links[]` with `source`, `target`, `cost`
- `links[]` with `traffic`, `utilization` (for traffic impact)

**Features**:
- Link selection
- Impact metrics
- Affected node count
- Traffic redistribution preview

---

## Common Modal Structure

```tsx
const ExampleModal: React.FC<ModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Modal Title</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div>
          {/* Modal content here */}
        </div>
      </div>
    </div>
  );
};
```

## Keyboard Shortcuts

- **Escape**: Close modal
- **Tab**: Navigate between inputs
- **Enter**: Confirm/submit (where applicable)
