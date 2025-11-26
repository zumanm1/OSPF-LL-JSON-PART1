# Quick Start Guide

Get NetViz Pro running in 5 minutes.

## 1. Start the App

```bash
cd /Users/macbook/OSPF-LL-JSON/netviz-pro
npm run dev
```

Open: **http://localhost:9040**

## 2. Upload a Topology File

1. Click **"Upload Topology"** button (left panel)
2. Select a JSON topology file
3. Recommended test file: `/Users/macbook/OSPF-LL-JSON/input-file-TX.json`

## 3. Explore the Network Graph

### Navigation
- **Pan**: Click and drag on empty space
- **Zoom**: Scroll wheel or pinch
- **Move Node**: Click and drag a node

### Node Interaction
- **Click node**: View node details in right panel
- **Hover node**: See node label

### Link Interaction
- **Click link**: View link details (source, target, cost, capacity)

## 4. Use Analysis Tools

The toolbar provides these analysis buttons:

| Button | Description |
|--------|-------------|
| **Pair** | Compare paths between country pairs |
| **Impact** | Analyze link failure impact |
| **Transit** | Find transit countries in paths |
| **What-If** | Simulate link modifications |
| **Matrix** | View full cost matrix |
| **Dijkstra** | Find shortest paths |
| **Traffic** | Analyze traffic flows |
| **Optimizer** | Optimize link costs |
| **Ripple** | Visualize failure cascades |
| **Health** | Network health dashboard |
| **Capacity** | Capacity planning dashboard |
| **Util Matrix** | Traffic utilization matrix |

## 5. Export Results

Most analysis modals include an **"Export CSV"** button to download results.

## 6. Mode Toggle

Switch between:
- **Monitor Mode**: Read-only view of current topology
- **Simulation Mode**: Test what-if scenarios with modified links

## Example Workflow

### Find the shortest path between two routers:

1. Click **"Dijkstra"** button
2. Select source node from dropdown
3. Select destination node
4. Click **"Find Path"**
5. View path details and total cost

### Analyze traffic utilization:

1. Click **"Util Matrix"** button
2. View country-to-country traffic utilization
3. Cells are color-coded by utilization level:
   - Green: <60%
   - Yellow: 60-70%
   - Orange: 70-90%
   - Red: >90%

### Check network health:

1. Click **"Health"** button
2. View overall health score
3. See breakdown by category:
   - Connectivity
   - Redundancy
   - Capacity
   - Latency

## Minimum Input File

```json
{
  "nodes": [
    {"id": "R1", "label": "Router1", "ip": "10.0.0.1", "country": "USA"},
    {"id": "R2", "label": "Router2", "ip": "10.0.0.2", "country": "GBR"}
  ],
  "links": [
    {"source": "R1", "target": "R2", "cost": 10}
  ]
}
```

## Next Steps

- See [Input Format](../input-format/README.md) for full file specification
- See [Components](../components/README.md) for feature details
- See [Troubleshooting](../guides/TROUBLESHOOTING.md) if issues arise
