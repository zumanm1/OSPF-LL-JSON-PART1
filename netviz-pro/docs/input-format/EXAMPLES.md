# Example Topology Files

## Minimal Topology

The simplest valid topology:

```json
{
  "nodes": [
    {"id": "R1", "label": "Router1"},
    {"id": "R2", "label": "Router2"}
  ],
  "links": [
    {"source": "R1", "target": "R2", "cost": 10}
  ]
}
```

## Small Network (3 nodes)

```json
{
  "metadata": {
    "data_source": "small_network.json",
    "snapshot_timestamp": "2024-11-25T10:00:00Z"
  },
  "nodes": [
    {"id": "HQ", "label": "Headquarters", "ip": "10.0.0.1", "country": "USA"},
    {"id": "BR1", "label": "Branch-1", "ip": "10.0.1.1", "country": "GBR"},
    {"id": "BR2", "label": "Branch-2", "ip": "10.0.2.1", "country": "DEU"}
  ],
  "links": [
    {"source": "HQ", "target": "BR1", "cost": 100},
    {"source": "HQ", "target": "BR2", "cost": 150},
    {"source": "BR1", "target": "BR2", "cost": 50}
  ]
}
```

## Network with Traffic Data

```json
{
  "nodes": [
    {"id": "NYC", "label": "NYC-Core", "country": "USA"},
    {"id": "LON", "label": "London-Core", "country": "GBR"},
    {"id": "FRA", "label": "Frankfurt-Core", "country": "DEU"}
  ],
  "links": [
    {
      "source": "NYC",
      "target": "LON",
      "cost": 100,
      "interface": "HundredGigE0/0/0",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 65000,
      "utilization": 65
    },
    {
      "source": "LON",
      "target": "FRA",
      "cost": 50,
      "interface": "TenGigE0/1/0",
      "interface_type": "10G",
      "capacity": 10000,
      "traffic": 8500,
      "utilization": 85
    },
    {
      "source": "NYC",
      "target": "FRA",
      "cost": 120,
      "interface": "HundredGigE0/0/1",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 25000,
      "utilization": 25
    }
  ]
}
```

## Network with Bundle Interfaces

```json
{
  "nodes": [
    {"id": "DC1", "label": "DataCenter-1", "country": "USA"},
    {"id": "DC2", "label": "DataCenter-2", "country": "USA"}
  ],
  "links": [
    {
      "source": "DC1",
      "target": "DC2",
      "cost": 10,
      "interface": "Bundle-Ether100",
      "interface_type": "bundle",
      "capacity": 400000,
      "bundle_members": [
        "HundredGigE0/0/0",
        "HundredGigE0/0/1",
        "HundredGigE0/1/0",
        "HundredGigE0/1/1"
      ],
      "bundle_capacity": 400000,
      "traffic": 250000,
      "utilization": 62.5
    }
  ]
}
```

## Network with Traffic Snapshots

```json
{
  "metadata": {
    "data_source": "production_network.json"
  },
  "nodes": [
    {"id": "R1", "label": "Router-1", "country": "USA"},
    {"id": "R2", "label": "Router-2", "country": "GBR"}
  ],
  "links": [
    {
      "source": "R1",
      "target": "R2",
      "cost": 100,
      "capacity": 100000,
      "traffic": 45000,
      "utilization": 45
    }
  ],
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
        {"source": "R1", "target": "R2", "traffic": 92000, "utilization": 92}
      ]
    },
    {
      "name": "maintenance",
      "timestamp": "2024-11-20T02:00:00Z",
      "links": [
        {"source": "R1", "target": "R2", "traffic": 15000, "utilization": 15}
      ]
    }
  ]
}
```

## Full Production Example

A complete 18-node topology with all features:

```json
{
  "metadata": {
    "data_source": "global_network_topology.json",
    "snapshot_timestamp": "2024-11-25T12:00:00Z",
    "version": "2.0",
    "description": "Global OSPF network with 12 countries"
  },
  "nodes": [
    {"id": "R01-US-PAX", "label": "US-PAX-Core", "ip": "10.1.1.1", "country": "USA", "status": "active"},
    {"id": "R02-US-CHI", "label": "US-CHI-Core", "ip": "10.1.2.1", "country": "USA", "status": "active"},
    {"id": "R03-GB-LON", "label": "GB-LON-Core", "ip": "10.2.1.1", "country": "GBR", "status": "active"},
    {"id": "R04-DE-FRA", "label": "DE-FRA-Core", "ip": "10.3.1.1", "country": "DEU", "status": "active"},
    {"id": "R05-JP-TYO", "label": "JP-TYO-Core", "ip": "10.4.1.1", "country": "JPN", "status": "active"},
    {"id": "R06-AU-SYD", "label": "AU-SYD-Core", "ip": "10.5.1.1", "country": "AUS", "status": "active"},
    {"id": "R07-SG-SIN", "label": "SG-SIN-Core", "ip": "10.6.1.1", "country": "SGP", "status": "active"},
    {"id": "R08-IN-BOM", "label": "IN-BOM-Core", "ip": "10.7.1.1", "country": "IND", "status": "active"}
  ],
  "links": [
    {
      "source": "R01-US-PAX",
      "target": "R02-US-CHI",
      "cost": 10,
      "interface": "HundredGigE0/0/0",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 45000,
      "utilization": 45
    },
    {
      "source": "R01-US-PAX",
      "target": "R05-JP-TYO",
      "cost": 150,
      "interface": "HundredGigE0/1/0",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 72000,
      "utilization": 72
    },
    {
      "source": "R02-US-CHI",
      "target": "R03-GB-LON",
      "cost": 100,
      "interface": "HundredGigE0/0/1",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 88000,
      "utilization": 88
    },
    {
      "source": "R03-GB-LON",
      "target": "R04-DE-FRA",
      "cost": 20,
      "interface": "TenGigE0/2/0",
      "interface_type": "10G",
      "capacity": 10000,
      "traffic": 5200,
      "utilization": 52
    },
    {
      "source": "R05-JP-TYO",
      "target": "R07-SG-SIN",
      "cost": 80,
      "interface": "HundredGigE0/0/2",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 92000,
      "utilization": 92
    },
    {
      "source": "R07-SG-SIN",
      "target": "R08-IN-BOM",
      "cost": 60,
      "interface": "TenGigE0/1/1",
      "interface_type": "10G",
      "capacity": 10000,
      "traffic": 8300,
      "utilization": 83
    },
    {
      "source": "R07-SG-SIN",
      "target": "R06-AU-SYD",
      "cost": 90,
      "interface": "HundredGigE0/1/1",
      "interface_type": "100G",
      "capacity": 100000,
      "traffic": 42000,
      "utilization": 42
    }
  ],
  "traffic_snapshots": [
    {
      "name": "baseline",
      "timestamp": "2024-11-01T00:00:00Z",
      "links": [
        {"source": "R01-US-PAX", "target": "R02-US-CHI", "traffic": 35000, "utilization": 35},
        {"source": "R01-US-PAX", "target": "R05-JP-TYO", "traffic": 55000, "utilization": 55}
      ]
    }
  ]
}
```

## Test File Location

A complete test topology is available at:
```
/Users/macbook/OSPF-LL-JSON/input-file-TX.json
```

This file contains:
- 18 nodes across 12 countries
- 30 links with full traffic data
- 3 traffic snapshots (baseline, peak, maintenance)
