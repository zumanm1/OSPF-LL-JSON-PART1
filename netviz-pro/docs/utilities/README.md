# Utilities Reference

Core utility functions for graph algorithms and data processing.

## Files

| File | Description |
|------|-------------|
| `utils/parser.ts` | JSON parsing and validation |
| `utils/graphAlgorithms.ts` | Dijkstra, path finding, graph analysis |

---

## parser.ts

**Location**: `/netviz-pro/utils/parser.ts`

### parseNetworkData()

Parses and validates JSON topology data.

```typescript
function parseNetworkData(json: any): NetworkData
```

**Input**: Raw JSON object from file upload

**Returns**: Validated `NetworkData` object

**Validation**:
- Checks for required `nodes` and `links` arrays
- Validates node ID uniqueness
- Validates link source/target references
- Sets defaults for missing optional fields

**Example**:
```typescript
const rawJson = JSON.parse(fileContent);
const networkData = parseNetworkData(rawJson);
```

### validateTopology()

Validates topology data integrity.

```typescript
function validateTopology(data: NetworkData): ValidationResult
```

**Returns**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## graphAlgorithms.ts

**Location**: `/netviz-pro/utils/graphAlgorithms.ts`

### dijkstra()

Finds shortest path using Dijkstra's algorithm.

```typescript
function dijkstra(
  nodes: Node[],
  links: Link[],
  startId: string,
  endId: string
): DijkstraResult
```

**Returns**:
```typescript
interface DijkstraResult {
  path: string[];      // Node IDs in order
  cost: number;        // Total path cost
  found: boolean;      // Whether path exists
}
```

**Example**:
```typescript
const result = dijkstra(data.nodes, data.links, "R1", "R5");
if (result.found) {
  console.log(`Path: ${result.path.join(' → ')}`);
  console.log(`Total cost: ${result.cost}`);
}
```

### findAllPaths()

Finds all possible paths between two nodes (up to a limit).

```typescript
function findAllPaths(
  nodes: Node[],
  links: Link[],
  startId: string,
  endId: string,
  maxPaths?: number  // Default: 100
): PathResult[]
```

**Returns**:
```typescript
interface PathResult {
  path: string[];      // Node IDs in order
  cost: number;        // Total path cost
  hops: number;        // Number of hops
  links: Link[];       // Links in path
}
```

**Important**: Parameters are `(nodes, links, start, end)` - NOT `(data, start, end)`.

**Example**:
```typescript
// Correct usage
const paths = findAllPaths(data.nodes, data.links, "R1", "R5");

// WRONG - will cause "nodes.forEach is not a function" error
const paths = findAllPaths(data, "R1", "R5");  // DON'T DO THIS
```

### buildAdjacencyList()

Creates adjacency list from links for faster traversal.

```typescript
function buildAdjacencyList(links: Link[]): Map<string, Link[]>
```

**Returns**: Map where key is node ID, value is array of connected links.

### computeFullCostMatrix()

Computes shortest path costs between all node pairs.

```typescript
function computeFullCostMatrix(
  nodes: Node[],
  links: Link[]
): CostMatrix
```

**Returns**:
```typescript
interface CostMatrix {
  nodeIds: string[];           // Ordered node IDs
  matrix: number[][];          // NxN cost matrix
  paths: Map<string, string[]>; // Paths for each pair
}
```

### getConnectedComponents()

Finds disconnected subgraphs.

```typescript
function getConnectedComponents(
  nodes: Node[],
  links: Link[]
): Node[][]
```

**Returns**: Array of node arrays, one per component.

### computeNodeCentrality()

Calculates betweenness centrality for nodes.

```typescript
function computeNodeCentrality(
  nodes: Node[],
  links: Link[]
): Map<string, number>
```

**Returns**: Map of node ID to centrality score (0-1).

### findCriticalLinks()

Identifies links whose failure would disconnect the network.

```typescript
function findCriticalLinks(
  nodes: Node[],
  links: Link[]
): Link[]
```

**Returns**: Array of critical links (bridges).

### computeRedundancyScore()

Calculates network redundancy metric.

```typescript
function computeRedundancyScore(
  nodes: Node[],
  links: Link[]
): number
```

**Returns**: Score from 0 (no redundancy) to 1 (fully redundant).

---

## Usage Examples

### Find shortest path with details

```typescript
import { dijkstra, findAllPaths } from './utils/graphAlgorithms';

// Shortest path only
const shortest = dijkstra(nodes, links, "NYC", "LON");

// All paths for comparison
const allPaths = findAllPaths(nodes, links, "NYC", "LON", 10);

// Sort by cost
allPaths.sort((a, b) => a.cost - b.cost);
```

### Analyze transit countries

```typescript
import { findAllPaths } from './utils/graphAlgorithms';

// Find paths between countries
const usaNodes = nodes.filter(n => n.country === 'USA');
const gbrNodes = nodes.filter(n => n.country === 'GBR');

const transitCounts = new Map<string, number>();

for (const src of usaNodes) {
  for (const dst of gbrNodes) {
    const paths = findAllPaths(nodes, links, src.id, dst.id);
    for (const path of paths) {
      for (const nodeId of path.path) {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.country !== 'USA' && node.country !== 'GBR') {
          transitCounts.set(node.country,
            (transitCounts.get(node.country) || 0) + 1);
        }
      }
    }
  }
}
```

### Calculate network health

```typescript
import {
  getConnectedComponents,
  computeRedundancyScore,
  findCriticalLinks
} from './utils/graphAlgorithms';

const components = getConnectedComponents(nodes, links);
const isConnected = components.length === 1;

const redundancy = computeRedundancyScore(nodes, links);
const criticalLinks = findCriticalLinks(nodes, links);

const healthScore = (
  (isConnected ? 0.4 : 0) +
  (redundancy * 0.3) +
  ((1 - criticalLinks.length / links.length) * 0.3)
);
```

---

## Performance Notes

- `dijkstra()`: O(V log V + E) - efficient for single-pair
- `findAllPaths()`: O(V!) worst case - use `maxPaths` limit
- `computeFullCostMatrix()`: O(V² log V) - cache results
- Large networks (1000+ nodes): Consider web workers

## Error Handling

All functions throw descriptive errors:

```typescript
try {
  const result = dijkstra(nodes, links, "INVALID", "R2");
} catch (error) {
  console.error(error.message); // "Start node not found: INVALID"
}
```
