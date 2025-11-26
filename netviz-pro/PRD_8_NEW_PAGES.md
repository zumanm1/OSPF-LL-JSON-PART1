# PRD: 8 New Pages for NetViz Pro OSPF Network Analyzer

## Executive Summary

This document outlines 8 new pages to enhance NetViz Pro for OSPF network engineers. Each page focuses on a specific aspect of network analysis, planning, and what-if scenarios.

---

## Current App Understanding

### Data Flow
```
JSON Topology File → Parser → NetworkData → D3 Visualization
                                    ↓
                              Path Analysis (Dijkstra)
                                    ↓
                              Cost Calculations
```

### Core Concepts
- **Loopback-to-Loopback**: Traffic flows between router loopbacks
- **OSPF Cost**: Determines path selection (lower = preferred)
- **Asymmetric Routing**: Forward/Reverse costs can differ
- **Transit Country**: Country that traffic passes through (not source/dest)

---

## PAGE 1: Transit Country Analyzer

### Purpose
Deep analysis of which countries serve as transit hubs for traffic between other countries.

### Features
- Show all countries acting as transit
- For each transit country:
  - Which country pairs use it
  - How many paths traverse it
  - Criticality score (impact if removed)
  - Which specific nodes are transit points
- Visual: Sankey diagram showing traffic flow through transit countries
- Filter by source/destination country pair

### UI Components
- Country selector (multi-select for filter)
- Transit country cards with metrics
- Flow visualization
- "What if this transit country is down?" analysis

### Data Required
```typescript
interface TransitAnalysis {
  transitCountry: string;
  criticalityScore: number; // 0-100
  pathsThrough: number;
  countryPairsServed: { source: string; dest: string; paths: number }[];
  transitNodes: { id: string; pathsThrough: number }[];
  alternativeRoutes: number; // Paths that DON'T use this transit
}
```

---

## PAGE 2: What-If Scenario Planner

### Purpose
Compare multiple cost change scenarios side-by-side before implementing.

### Features
- Create up to 4 scenarios
- Each scenario can modify:
  - Link costs (forward/reverse)
  - Link status (up/down)
- Compare scenarios:
  - Path changes per country pair
  - Cost delta (increase/decrease)
  - Transit country changes
  - Risk score (how many paths affected)
- Recommend best scenario (minimal disruption)

### UI Components
- Scenario tabs (Scenario A, B, C, D)
- Link modification table per scenario
- Side-by-side comparison view
- "Apply Scenario" button (loads into simulation mode)

### Data Required
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  linkChanges: {
    linkIndex: number;
    newForwardCost?: number;
    newReverseCost?: number;
    newStatus?: 'up' | 'down';
  }[];
  impact: {
    pathsAffected: number;
    countryPairsAffected: number;
    avgCostChange: number;
    riskScore: number; // 0-100
  };
}
```

---

## PAGE 3: Full Cost Matrix Dashboard

### Purpose
Complete country-to-country cost matrix showing all available paths.

### Features
- NxN matrix grid (all countries × all countries)
- Each cell shows:
  - Min cost path
  - Number of available paths
  - Click to expand: all paths with details
- Color coding:
  - Green: Low cost (<100)
  - Yellow: Medium (100-1000)
  - Orange: High (1000-5000)
  - Red: Very high (>5000)
- Filter by:
  - Specific countries
  - Cost range
  - Path hop count
- Export to CSV/Excel

### UI Components
- Matrix grid (scrollable)
- Cell detail popup
- Filter panel
- Export buttons

### Data Required
```typescript
interface CostMatrixCell {
  sourceCountry: string;
  destCountry: string;
  minCost: number;
  maxCost: number;
  avgCost: number;
  pathCount: number;
  bestPath: string[]; // Node IDs
  transitCountries: string[];
}
```

---

## PAGE 4: Dijkstra Step-by-Step Visualizer

### Purpose
Educational tool showing how Dijkstra's algorithm calculates shortest paths.

### Features
- Select source and destination node
- Step-by-step animation:
  - Current node highlighted
  - Tentative distances shown
  - Visited nodes marked
  - Priority queue visualization
- Speed control (slow/medium/fast)
- Pause/Resume/Step buttons
- Final path highlighted with total cost breakdown

### UI Components
- Node selectors
- Control buttons (Play, Pause, Step, Reset)
- Speed slider
- Algorithm state panel:
  - Current node
  - Distance table
  - Priority queue
- Cost breakdown panel

### Data Required
```typescript
interface DijkstraStep {
  stepNumber: number;
  currentNode: string;
  distances: Map<string, number>;
  visited: Set<string>;
  priorityQueue: { node: string; distance: number }[];
  previousNode: Map<string, string>;
  description: string; // Human-readable step explanation
}
```

---

## PAGE 5: Traffic Flow Analyzer

### Purpose
Visualize which links carry traffic for specific country pairs.

### Features
- Select source and destination country
- Show all links used in paths between them
- Link thickness = traffic volume (number of paths using it)
- Color = utilization intensity
- Identify:
  - Single points of failure (only 1 path uses this link)
  - Heavily loaded links (many paths)
  - Unused links (zero traffic for this pair)
- Click link to see which specific paths use it

### UI Components
- Country pair selector
- Enhanced topology view with flow visualization
- Link detail panel
- "Bottleneck Detection" section

### Data Required
```typescript
interface LinkTrafficFlow {
  linkIndex: number;
  source: string;
  target: string;
  pathsUsingLink: PathResult[];
  trafficScore: number; // 0-100 based on usage
  isSinglePointOfFailure: boolean;
  alternativeLinks: number[]; // Other links that could route this traffic
}
```

---

## PAGE 6: OSPF Cost Optimizer

### Purpose
Auto-suggest optimal cost changes to achieve desired routing with minimal risk.

### Features
- Define routing goal:
  - "Route Country A → B through Country C"
  - "Avoid link X for traffic Y → Z"
  - "Balance traffic across multiple paths"
- Algorithm generates 4 options:
  - Option 1: Minimum changes (least risk)
  - Option 2: Best performance (optimal costs)
  - Option 3: Redundancy focused (multiple paths)
  - Option 4: Balanced approach
- Each option shows:
  - Required cost changes
  - Expected impact
  - Risk assessment
  - Rollback plan

### UI Components
- Goal definition wizard
- Options comparison table
- Impact preview per option
- "Apply Option" button

### Data Required
```typescript
interface OptimizationGoal {
  type: 'route_through' | 'avoid_link' | 'balance_traffic' | 'prefer_path';
  sourceCountry: string;
  destCountry: string;
  targetTransitCountry?: string; // For route_through
  avoidLinkIndex?: number; // For avoid_link
  constraints: {
    maxCostIncrease: number;
    maxLinksToChange: number;
    preserveRedundancy: boolean;
  };
}

interface OptimizationOption {
  id: string;
  name: string;
  changes: { linkIndex: number; newCost: number }[];
  predictedImpact: {
    pathsAffected: number;
    avgCostDelta: number;
    redundancyScore: number;
  };
  riskScore: number;
  rollbackSteps: string[];
}
```

---

## PAGE 7: Ripple Effect Analyzer

### Purpose
Show downstream impact of any link change on the entire network.

### Features
- Select a link to modify
- Show 3 levels of impact:
  - Level 1: Direct (connected nodes)
  - Level 2: Indirect (1 hop away)
  - Level 3: Network-wide (all affected paths)
- Impact visualization:
  - Before/After path comparison
  - Cost changes per country pair
  - Transit country shifts
- "Cascade Analysis": What if this causes traffic to shift to another link, overloading it?

### UI Components
- Link selector
- Impact level tabs (L1, L2, L3)
- Before/After comparison panels
- Cascade warning indicators
- Impact summary metrics

### Data Required
```typescript
interface RippleEffect {
  modifiedLink: number;
  level1Impact: {
    nodes: string[];
    directCostChange: number;
  };
  level2Impact: {
    nodes: string[];
    pathsRerouted: number;
    newTransitCountries: string[];
  };
  level3Impact: {
    totalPathsAffected: number;
    countryPairsAffected: number;
    avgNetworkCostChange: number;
    cascadeRisk: { linkIndex: number; newLoad: number }[];
  };
}
```

---

## PAGE 8: Network Health Dashboard

### Purpose
Overall network health metrics, bottleneck detection, and recommendations.

### Features
- Key Metrics:
  - Total nodes/links
  - Average path cost
  - Network redundancy score
  - Single points of failure count
- Bottleneck Detection:
  - Links with highest utilization
  - Countries with most transit traffic
  - Asymmetric routing warnings
- Recommendations:
  - "Add redundant link between X and Y"
  - "Reduce cost on link Z to balance traffic"
  - "Country W is single transit point - high risk"
- Health score: 0-100 (computed from all metrics)

### UI Components
- Dashboard cards (key metrics)
- Bottleneck alerts panel
- Recommendations list
- Health score gauge
- Trend charts (if historical data available)

### Data Required
```typescript
interface NetworkHealth {
  overallScore: number; // 0-100
  metrics: {
    nodeCount: number;
    linkCount: number;
    avgPathCost: number;
    redundancyScore: number;
    singlePointsOfFailure: number;
    asymmetricLinkCount: number;
  };
  bottlenecks: {
    type: 'link' | 'node' | 'country';
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  recommendations: {
    priority: number;
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }[];
}
```

---

## Enhanced JSON Schema

To support all features, the input JSON should include:

```json
{
  "nodes": [
    {
      "id": "R1",
      "name": "R1",
      "hostname": "zim-r1",
      "loopback_ip": "172.16.1.1",
      "country": "ZIM",
      "region": "Africa",
      "datacenter": "DC1",
      "role": "core",
      "capacity": 10000,
      "is_active": true,
      "node_type": "router",
      "ospf_area": "0.0.0.0",
      "router_id": "172.16.1.1"
    }
  ],
  "links": [
    {
      "source": "R1",
      "target": "R2",
      "source_interface": "Gi0/0",
      "target_interface": "Gi0/0",
      "forward_cost": 100,
      "reverse_cost": 100,
      "bandwidth": "10Gbps",
      "latency_ms": 5,
      "utilization_percent": 45,
      "status": "up",
      "link_type": "backbone",
      "ospf_network_type": "point-to-point"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-25T12:00:00Z",
    "source": "live_network",
    "ospf_process_id": 1,
    "network_name": "Global WAN"
  }
}
```

---

## Implementation Order

1. **Transit Country Analyzer** - Foundation for understanding traffic flow
2. **What-If Scenario Planner** - Core planning feature
3. **Cost Matrix Dashboard** - Essential visibility
4. **Dijkstra Visualizer** - Educational/debugging
5. **Traffic Flow Analyzer** - Advanced visualization
6. **OSPF Cost Optimizer** - Automation
7. **Ripple Effect Analyzer** - Impact analysis
8. **Network Health Dashboard** - Operations view

---

## Technical Notes

- All pages should reuse existing `graphAlgorithms.ts` and `impactAnalysis.ts`
- State management via React Context or props drilling (existing pattern)
- D3.js for visualizations
- Export functionality to JSON/CSV where applicable
- All calculations should be client-side (no backend required)
