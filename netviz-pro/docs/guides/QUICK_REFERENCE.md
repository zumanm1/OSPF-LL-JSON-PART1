# Quick Reference Card

## Start the App

```bash
cd /Users/macbook/OSPF-LL-JSON/netviz-pro
npm run dev
# Open: http://localhost:9040
```

## Minimum Input File

```json
{
  "nodes": [{"id": "R1", "label": "Router1"}],
  "links": [{"source": "R1", "target": "R2", "cost": 10}]
}
```

## Node Fields

| Field | Required | Example |
|-------|----------|---------|
| `id` | Yes | `"R1-US-NYC"` |
| `label` | Yes | `"NYC-Core-01"` |
| `ip` | No | `"10.1.1.1"` |
| `country` | No | `"USA"` |
| `status` | No | `"active"` |

## Link Fields

| Field | Required | Example |
|-------|----------|---------|
| `source` | Yes | `"R1"` |
| `target` | Yes | `"R2"` |
| `cost` | Yes | `100` |
| `capacity` | No | `100000` |
| `traffic` | No | `45000` |
| `utilization` | No | `45` |
| `interface` | No | `"HundredGigE0/0/0"` |

## Country Codes

`USA` `GBR` `DEU` `FRA` `JPN` `AUS` `BRA` `IND` `SGP` `NLD` `ARE` `ZAF`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Esc | Close modal |
| Scroll | Zoom graph |
| Drag | Pan/move nodes |

## Toolbar Buttons

| Button | Modal | Required Data |
|--------|-------|---------------|
| Pair | PairCountriesModal | nodes.country |
| Impact | ImpactAnalysisModal | links.traffic |
| Transit | TransitAnalyzerModal | nodes.country |
| What-If | WhatIfAnalysisModal | basic |
| Matrix | FullCostMatrixModal | basic |
| Dijkstra | DijkstraVisualizer | basic |
| Traffic | TrafficFlowModal | links.traffic |
| Optimizer | CostOptimizerModal | links.capacity |
| Ripple | RippleEffectModal | basic |
| Health | NetworkHealthModal | basic |
| Capacity | CapacityPlanningModal | links.capacity/traffic |
| Util Matrix | TrafficUtilizationMatrix | links.utilization |

## Utilization Colors

| Color | Range |
|-------|-------|
| Green | <60% |
| Yellow | 60-70% |
| Orange | 70-90% |
| Red | >90% |

## Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Kill port 9040
lsof -ti:9040 | xargs kill -9

# Validate JSON
jq . file.json
```

## File Locations

| File | Purpose |
|------|---------|
| `/netviz-pro/App.tsx` | Main app |
| `/netviz-pro/types.ts` | TypeScript types |
| `/netviz-pro/utils/parser.ts` | JSON parser |
| `/netviz-pro/utils/graphAlgorithms.ts` | Dijkstra, paths |
| `/netviz-pro/components/*.tsx` | UI components |
| `/netviz-pro/docs/` | Documentation |

## Test File

```
/Users/macbook/OSPF-LL-JSON/input-file-TX.json
```

## API Functions

```typescript
// Shortest path
dijkstra(nodes, links, "R1", "R5")

// All paths
findAllPaths(nodes, links, "R1", "R5")

// Parse file
parseNetworkData(jsonObject)
```
