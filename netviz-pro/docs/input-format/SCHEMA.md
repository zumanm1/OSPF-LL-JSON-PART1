# JSON Schema Reference

Complete specification for NetViz Pro topology files.

## Root Object

```typescript
interface NetworkData {
  metadata?: Metadata;
  nodes: Node[];
  links: Link[];
  traffic_snapshots?: TrafficSnapshot[];
}
```

## Metadata Object

```typescript
interface Metadata {
  data_source?: string;         // Source filename
  snapshot_timestamp?: string;  // ISO 8601 datetime
  version?: string;             // Schema version
  description?: string;         // File description
}
```

**Example:**
```json
{
  "metadata": {
    "data_source": "ospf_export_2024.json",
    "snapshot_timestamp": "2024-11-25T14:30:00Z",
    "version": "1.0",
    "description": "Production network topology"
  }
}
```

## Node Object

```typescript
interface Node {
  id: string;           // Required: Unique identifier
  label: string;        // Required: Display name
  ip?: string;          // IP address
  country?: string;     // ISO 3166-1 alpha-3 country code
  status?: string;      // "active" | "inactive"
  type?: string;        // Router type/role
  x?: number;           // Initial X position
  y?: number;           // Initial Y position
}
```

**Example:**
```json
{
  "id": "R1-US-NYC-01",
  "label": "NYC-Core-Router-01",
  "ip": "10.1.1.1",
  "country": "USA",
  "status": "active",
  "type": "core"
}
```

### Country Codes (Supported)

| Code | Country |
|------|---------|
| USA | United States |
| GBR | United Kingdom |
| DEU | Germany |
| FRA | France |
| JPN | Japan |
| AUS | Australia |
| BRA | Brazil |
| IND | India |
| SGP | Singapore |
| NLD | Netherlands |
| ARE | UAE |
| ZAF | South Africa |

## Link Object

```typescript
interface Link {
  source: string;       // Required: Source node ID
  target: string;       // Required: Target node ID
  cost: number;         // Required: OSPF cost (1-65535)

  // Interface Details
  interface?: string;   // Interface name
  interface_type?: string; // "1G" | "10G" | "100G" | "bundle"

  // Capacity Data
  capacity?: number;    // Max capacity in Mbps
  traffic?: number;     // Current traffic in Mbps
  utilization?: number; // Utilization percentage (0-100)

  // Bundle Details (for LAG interfaces)
  bundle_members?: string[];  // Member interface names
  bundle_capacity?: number;   // Total bundle capacity

  // Status
  status?: string;      // "up" | "down"
  admin_status?: string; // "enabled" | "disabled"
}
```

**Basic Example:**
```json
{
  "source": "R1",
  "target": "R2",
  "cost": 100
}
```

**Full Example:**
```json
{
  "source": "R1-US-NYC",
  "target": "R2-GB-LON",
  "cost": 100,
  "interface": "hundredGigE0/0/0",
  "interface_type": "100G",
  "capacity": 100000,
  "traffic": 45000,
  "utilization": 45,
  "status": "up",
  "admin_status": "enabled"
}
```

### Interface Types & Capacities

| Type | Capacity (Mbps) | Example Interface |
|------|-----------------|-------------------|
| 1G | 1000 | GigabitEthernet0/0 |
| 10G | 10000 | TenGigE0/0/0 |
| 100G | 100000 | HundredGigE0/0/0 |
| bundle | varies | Bundle-Ether100 |

### Bundle Interface Example

```json
{
  "source": "R1",
  "target": "R2",
  "cost": 50,
  "interface": "Bundle-Ether100",
  "interface_type": "bundle",
  "capacity": 200000,
  "bundle_members": [
    "HundredGigE0/0/0",
    "HundredGigE0/0/1"
  ],
  "bundle_capacity": 200000,
  "traffic": 120000,
  "utilization": 60
}
```

## Traffic Snapshots

Historical traffic data for comparison analysis.

```typescript
interface TrafficSnapshot {
  name: string;         // Snapshot name (e.g., "baseline", "peak")
  timestamp: string;    // ISO 8601 datetime
  links: LinkTraffic[]; // Traffic data per link
}

interface LinkTraffic {
  source: string;       // Source node ID
  target: string;       // Target node ID
  traffic: number;      // Traffic in Mbps
  utilization: number;  // Utilization percentage
}
```

**Example:**
```json
{
  "traffic_snapshots": [
    {
      "name": "baseline",
      "timestamp": "2024-11-01T00:00:00Z",
      "links": [
        {"source": "R1", "target": "R2", "traffic": 30000, "utilization": 30}
      ]
    },
    {
      "name": "peak",
      "timestamp": "2024-11-15T14:00:00Z",
      "links": [
        {"source": "R1", "target": "R2", "traffic": 85000, "utilization": 85}
      ]
    }
  ]
}
```

## Validation Rules

### Node Validation
1. `id` must be unique across all nodes
2. `id` cannot be empty or contain only whitespace
3. `label` is required

### Link Validation
1. `source` must reference an existing node ID
2. `target` must reference an existing node ID
3. `source` cannot equal `target` (no self-loops)
4. `cost` must be positive integer (1-65535)
5. `utilization` should be 0-100 if provided

### Capacity Validation
1. If `traffic` is provided, `capacity` should also be provided
2. `traffic` should not exceed `capacity`
3. `utilization` should equal `(traffic/capacity) * 100`
