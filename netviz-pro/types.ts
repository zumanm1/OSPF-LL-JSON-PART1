export interface NetworkNode {
  id: string;
  name: string;
  hostname: string;
  loopback_ip: string;
  country: string;
  port?: number;
  neighbor_count?: number;
  is_active: boolean;
  node_type: string;
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  source_interface: string;
  target_interface: string;
  cost: number;
  forward_cost?: number;
  reverse_cost?: number;
  is_symmetric?: boolean;
  status: string;
  edge_type?: string;
  index?: number;
  // Simulation properties
  original_cost?: number;
  original_status?: string;
  is_modified?: boolean;
}

export interface GraphMetadata {
  export_timestamp?: string;
  node_count?: number;
  edge_count?: number;
  layout_algorithm?: string;
  data_source?: string;
  snapshot_id?: number;
  snapshot_timestamp?: string;
  age_seconds?: number;
  cached?: boolean;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  metadata?: GraphMetadata;
  timestamp?: string;
  version?: string;
}

export interface PathResult {
  id: string;
  nodes: string[]; // Array of Node IDs
  links: number[]; // Array of Link Indices (if available) or we match by source/target
  totalCost: number;
  hopCount: number;
}