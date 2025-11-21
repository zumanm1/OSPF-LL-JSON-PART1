export const COUNTRY_COLORS: Record<string, string> = {
  ZIM: "#10b981", // Emerald 500
  USA: "#3b82f6", // Blue 500
  DEU: "#f59e0b", // Amber 500
  GBR: "#ef4444", // Red 500
  DEFAULT: "#8b5cf6", // Violet 500
};

export const NODE_RADIUS = 20;
export const ACTIVE_STROKE_COLOR = "#ffffff";
export const INACTIVE_STROKE_COLOR = "#4b5563"; // Gray 600

export const LINK_COLOR_UP = "#4b5563"; // Gray 600
export const LINK_COLOR_DOWN = "#ef4444"; // Red 500
export const LINK_COLOR_SYMMETRIC = "#10b981"; // Emerald 500 (if we want to highlight symmetry)

export const SAMPLE_DATA = {
  "nodes": [
    {
      "id": "R1",
      "name": "R1",
      "hostname": "zim-r1",
      "loopback_ip": "172.16.1.1",
      "country": "ZIM",
      "port": 5000,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 550,
      "y": 476
    },
    {
      "id": "R2",
      "name": "R2",
      "hostname": "zim-r2",
      "loopback_ip": "172.16.2.2",
      "country": "ZIM",
      "port": 5001,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 387,
      "y": 442
    },
    {
      "id": "R3",
      "name": "R3",
      "hostname": "zim-r3",
      "loopback_ip": "172.16.3.3",
      "country": "ZIM",
      "port": 5002,
      "neighbor_count": 2,
      "is_active": true,
      "node_type": "router",
      "x": 464,
      "y": 603
    },
    {
      "id": "R4",
      "name": "R4",
      "hostname": "zim-r4",
      "loopback_ip": "172.16.4.4",
      "country": "ZIM",
      "port": 5003,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 642,
      "y": 611
    },
    {
      "id": "R5",
      "name": "R5",
      "hostname": "usa-r5",
      "loopback_ip": "172.16.5.5",
      "country": "USA",
      "port": 5004,
      "neighbor_count": 2,
      "is_active": true,
      "node_type": "router",
      "x": 608,
      "y": 378
    },
    {
      "id": "R6",
      "name": "R6",
      "hostname": "deu-r6",
      "loopback_ip": "172.16.6.6",
      "country": "DEU",
      "port": 5005,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 642,
      "y": 167
    },
    {
      "id": "R7",
      "name": "R7",
      "hostname": "gbr-r7",
      "loopback_ip": "172.16.7.7",
      "country": "GBR",
      "port": 5006,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 660,
      "y": 321
    },
    {
      "id": "R8",
      "name": "R8",
      "hostname": "usa-r8",
      "loopback_ip": "172.16.8.8",
      "country": "USA",
      "port": 5007,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 762,
      "y": 458
    },
    {
      "id": "R9",
      "name": "R9",
      "hostname": "gbr-r9",
      "loopback_ip": "172.16.9.9",
      "country": "GBR",
      "port": 5008,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 803,
      "y": 269
    },
    {
      "id": "R10",
      "name": "R10",
      "hostname": "deu-r10",
      "loopback_ip": "172.16.10.10",
      "country": "DEU",
      "port": 5009,
      "neighbor_count": 3,
      "is_active": true,
      "node_type": "router",
      "x": 476,
      "y": 270
    }
  ],
  "links": [
    { "source": "R1", "target": "R4", "source_interface": "Fa1/0", "target_interface": "Fa1/0", "cost": 3450, "status": "up" },
    { "source": "R1", "target": "R2", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 9999, "status": "up" },
    { "source": "R1", "target": "R7", "source_interface": "Fa2/0", "target_interface": "Fa1/0", "cost": 8880, "status": "up" },
    { "source": "R2", "target": "R3", "source_interface": "Fa2/0", "target_interface": "Fa2/0", "cost": 900, "status": "up" },
    { "source": "R2", "target": "R1", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 9999, "status": "up" },
    { "source": "R2", "target": "R10", "source_interface": "Fa1/0", "target_interface": "Fa1/0", "cost": 10, "status": "up" },
    { "source": "R3", "target": "R2", "source_interface": "Fa2/0", "target_interface": "Fa2/0", "cost": 10, "status": "up" },
    { "source": "R3", "target": "R4", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 10, "status": "up" },
    { "source": "R4", "target": "R8", "source_interface": "Fa2/0", "target_interface": "Fa2/0", "cost": 10, "status": "up" },
    { "source": "R5", "target": "R8", "source_interface": "Fa1/0", "target_interface": "Fa1/0", "cost": 300, "status": "up" },
    { "source": "R5", "target": "R10", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 500, "status": "up" },
    { "source": "R6", "target": "R10", "source_interface": "Fa2/0", "target_interface": "Fa2/0", "cost": 900, "status": "up" },
    { "source": "R6", "target": "R7", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 7500, "status": "up" },
    { "source": "R6", "target": "R9", "source_interface": "Fa1/0", "target_interface": "Fa1/0", "cost": 700, "status": "up" },
    { "source": "R9", "target": "R8", "source_interface": "Fa0/1", "target_interface": "Fa0/1", "cost": 10, "status": "up" }
  ],
  "metadata": {
    "node_count": 10,
    "edge_count": 15,
    "data_source": "sample_data"
  }
};