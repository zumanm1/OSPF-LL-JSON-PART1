// Router role types for network topology
export type RouterRole = 'PE' | 'P' | 'RR' | 'CE' | 'ABR' | 'ASBR' | 'unknown';

export interface NetworkNode {
  id: string;
  name: string;
  hostname: string;           // Display hostname (can be mapped to new format)
  original_hostname?: string; // Original hostname from data source
  loopback_ip: string;
  country: string;
  city?: string;              // City code extracted from hostname (e.g., 'ber' from deu-ber-bes-pe10)
  site?: string;              // Site code extracted from hostname (e.g., 'bes' from deu-ber-bes-pe10)
  role?: RouterRole;          // Router role: PE, P, RR, etc.
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

// Interface capacity types
export type InterfaceSpeed = '1G' | '10G' | '25G' | '40G' | '100G' | '400G';
export type BundleType = 'bundle-ethernet' | 'port-channel' | 'lag';

export interface InterfaceCapacity {
  speed: InterfaceSpeed;              // Base interface speed
  is_bundle?: boolean;                // Is this a bundle/LAG?
  bundle_type?: BundleType;           // Type of bundle
  member_count?: number;              // Number of member interfaces
  member_speed?: InterfaceSpeed;      // Speed of each member
  total_capacity_mbps: number;        // Total capacity in Mbps (calculated)
  vlan_id?: number;                   // VLAN ID if subinterface
  is_subinterface?: boolean;          // Is this a subinterface?
}

export interface TrafficData {
  // Forward direction (source -> target)
  forward_traffic_mbps: number;       // Current traffic in Mbps
  forward_utilization_pct: number;    // Utilization percentage (0-100)
  // Reverse direction (target -> source)
  reverse_traffic_mbps: number;       // Current traffic in Mbps
  reverse_utilization_pct: number;    // Utilization percentage (0-100)
  // Timestamp of traffic snapshot
  snapshot_timestamp?: string;
  // Peak traffic data (optional)
  peak_forward_mbps?: number;
  peak_reverse_mbps?: number;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  source_interface: string;
  target_interface: string;
  // Primary cost fields for asymmetric routing
  forward_cost?: number;
  reverse_cost?: number;
  // Legacy cost field for backward compatibility
  cost: number;
  is_symmetric?: boolean;
  is_asymmetric?: boolean;
  status: string;
  edge_type?: string;
  index?: number;
  // Simulation properties
  original_cost?: number;
  original_forward_cost?: number;
  original_reverse_cost?: number;
  original_status?: string;
  is_modified?: boolean;
  // Capacity and Traffic properties
  source_capacity?: InterfaceCapacity;
  target_capacity?: InterfaceCapacity;
  traffic?: TrafficData;
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

export interface TrafficSnapshot {
  snapshot_id: string;
  snapshot_name: string;
  timestamp: string;
  // Map of link index to traffic data
  link_traffic: Record<number, TrafficData>;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  metadata?: GraphMetadata;
  timestamp?: string;
  version?: string;
  // Traffic snapshots for comparison
  traffic_snapshots?: TrafficSnapshot[];
  current_snapshot_id?: string;
}

export interface PathResult {
  id: string;
  nodes: string[]; // Array of Node IDs
  links: number[]; // Array of Link Indices (if available) or we match by source/target
  totalCost: number;
  hopCount: number;
}

// Hostname mapping configuration
export interface HostnameMapping {
  old_hostname: string;  // Original short hostname (e.g., 'deu-r10')
  new_hostname: string;  // New long hostname (e.g., 'deu-ber-bes-pe10')
  role: RouterRole;      // Router role: PE, P, RR, etc.
}

export interface HostnameMappingConfig {
  mappings: HostnameMapping[];
  // Optional: auto-detect role from hostname pattern
  auto_detect_role?: boolean;
}