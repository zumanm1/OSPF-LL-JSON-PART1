# Input File Format

NetViz Pro consumes JSON topology files that describe OSPF network structure.

## Overview

The input file contains:
- **nodes**: Router/device definitions
- **links**: Connections between nodes with OSPF costs
- **metadata**: Optional file information
- **traffic_snapshots**: Optional traffic data snapshots

## Quick Example

```json
{
  "metadata": {
    "data_source": "network_export.json",
    "snapshot_timestamp": "2024-11-25T10:00:00Z"
  },
  "nodes": [
    {
      "id": "R1-US-NYC",
      "label": "NYC-Core-01",
      "ip": "10.1.1.1",
      "country": "USA",
      "status": "active"
    },
    {
      "id": "R2-GB-LON",
      "label": "LON-Core-01",
      "ip": "10.1.2.1",
      "country": "GBR",
      "status": "active"
    }
  ],
  "links": [
    {
      "source": "R1-US-NYC",
      "target": "R2-GB-LON",
      "cost": 100,
      "interface": "hundredGigE0/0/0",
      "capacity": 100000,
      "traffic": 45000,
      "utilization": 45
    }
  ]
}
```

## Documentation

| Document | Description |
|----------|-------------|
| [Schema Reference](./SCHEMA.md) | Complete field specifications |
| [Examples](./EXAMPLES.md) | Sample topology files |

## Minimum Required Fields

### Nodes (minimum)
```json
{
  "id": "unique-id",
  "label": "Display Name"
}
```

### Links (minimum)
```json
{
  "source": "node-id-1",
  "target": "node-id-2",
  "cost": 10
}
```

## Field Summary

### Node Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique node identifier |
| `label` | Yes | string | Display name |
| `ip` | No | string | IP address |
| `country` | No | string | ISO 3166-1 alpha-3 code |
| `status` | No | string | "active" or "inactive" |

### Link Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `source` | Yes | string | Source node ID |
| `target` | Yes | string | Target node ID |
| `cost` | Yes | number | OSPF cost metric |
| `interface` | No | string | Interface name |
| `capacity` | No | number | Capacity in Mbps |
| `traffic` | No | number | Current traffic in Mbps |
| `utilization` | No | number | Utilization percentage (0-100) |

## Traffic Data

For traffic analysis features, include these link fields:
- `capacity`: Maximum bandwidth (Mbps)
- `traffic`: Current traffic load (Mbps)
- `utilization`: Calculated utilization percentage

See [Examples](./EXAMPLES.md) for complete sample files.
