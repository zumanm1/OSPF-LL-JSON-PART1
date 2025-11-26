// Base colors for known countries (can be extended)
const BASE_COUNTRY_COLORS: Record<string, string> = {
  // ===== AFRICA =====
  ZIM: "#10b981", // Zimbabwe (Emerald)
  ZWE: "#10b981", // Zimbabwe - ISO code (Emerald)
  ZAF: "#a855f7", // South Africa (Purple)
  RSA: "#a855f7", // South Africa - alt (Purple)
  NGA: "#22c55e", // Nigeria (Green)
  KEN: "#eab308", // Kenya (Yellow)
  EGY: "#f97316", // Egypt (Orange)
  ETH: "#84cc16", // Ethiopia (Lime)
  GHA: "#14b8a6", // Ghana (Teal)
  TZA: "#06b6d4", // Tanzania (Cyan)
  UGA: "#ec4899", // Uganda (Pink)
  MAR: "#e11d48", // Morocco (Rose)
  DZA: "#6366f1", // Algeria (Indigo)
  AGO: "#78716c", // Angola (Stone)
  MOZ: "#0ea5e9", // Mozambique (Sky)
  ZMB: "#65a30d", // Zambia (Lime-dark)
  BWA: "#7c3aed", // Botswana (Violet)
  NAM: "#db2777", // Namibia (Pink-dark)
  SEN: "#059669", // Senegal (Emerald-dark)
  CIV: "#ea580c", // Ivory Coast (Orange-dark)
  CMR: "#16a34a", // Cameroon (Green-dark)
  LSO: "#a3e635", // Lesotho (Lime-light)
  COD: "#0891b2", // DRC - Democratic Republic of Congo (Cyan-dark)
  DRC: "#0891b2", // DRC - alternate (Cyan-dark)
  RWA: "#4ade80", // Rwanda (Green-light)
  SWZ: "#c084fc", // Eswatini/Swaziland (Purple-light)
  MWI: "#f472b6", // Malawi (Pink-light)
  SDN: "#fbbf24", // Sudan (Amber-light)
  TUN: "#fb923c", // Tunisia (Orange-light)
  LBY: "#38bdf8", // Libya (Sky-light)

  // ===== EUROPE =====
  GBR: "#ef4444", // United Kingdom (Red)
  DEU: "#f59e0b", // Germany (Amber)
  FRA: "#8b5cf6", // France (Violet)
  ITA: "#22c55e", // Italy (Green)
  ESP: "#dc2626", // Spain (Red-dark)
  NLD: "#f97316", // Netherlands (Orange)
  BEL: "#eab308", // Belgium (Yellow)
  CHE: "#ef4444", // Switzerland (Red)
  AUT: "#ec4899", // Austria (Pink)
  POL: "#dc2626", // Poland (Red-dark)
  SWE: "#3b82f6", // Sweden (Blue)
  NOR: "#2563eb", // Norway (Blue-dark)
  DNK: "#dc2626", // Denmark (Red-dark)
  FIN: "#3b82f6", // Finland (Blue)
  PRT: "#22c55e", // Portugal (Green)
  IRL: "#10b981", // Ireland (Emerald)
  GRC: "#0ea5e9", // Greece (Sky)
  CZE: "#dc2626", // Czech Republic (Red-dark)
  ROU: "#3b82f6", // Romania (Blue)
  HUN: "#22c55e", // Hungary (Green)
  UKR: "#3b82f6", // Ukraine (Blue)
  RUS: "#dc2626", // Russia (Red-dark)

  // ===== AMERICAS =====
  USA: "#3b82f6", // United States (Blue)
  CAN: "#e11d48", // Canada (Rose)
  MEX: "#22c55e", // Mexico (Green)
  BRA: "#84cc16", // Brazil (Lime)
  ARG: "#0ea5e9", // Argentina (Sky)
  COL: "#eab308", // Colombia (Yellow)
  CHL: "#dc2626", // Chile (Red)
  PER: "#ef4444", // Peru (Red)

  // ===== ASIA & OCEANIA =====
  JPN: "#ec4899", // Japan (Pink)
  CHN: "#14b8a6", // China (Teal)
  IND: "#f97316", // India (Orange)
  KOR: "#3b82f6", // South Korea (Blue)
  AUS: "#06b6d4", // Australia (Cyan)
  NZL: "#0f766e", // New Zealand (Teal-dark)
  SGP: "#ef4444", // Singapore (Red)
  MYS: "#eab308", // Malaysia (Yellow)
  IDN: "#dc2626", // Indonesia (Red)
  THA: "#3b82f6", // Thailand (Blue)
  VNM: "#ef4444", // Vietnam (Red)
  PHL: "#3b82f6", // Philippines (Blue)

  // ===== MIDDLE EAST =====
  ARE: "#22c55e", // UAE (Green)
  SAU: "#22c55e", // Saudi Arabia (Green)
  ISR: "#3b82f6", // Israel (Blue)
  TUR: "#ef4444", // Turkey (Red)
  IRN: "#22c55e", // Iran (Green)

  DEFAULT: "#6b7280", // Gray 500
};

// Color palette for dynamically generated country colors
const DYNAMIC_COLOR_PALETTE = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
  "#e11d48", "#a855f7", "#22c55e", "#eab308", "#6366f1",
  "#d946ef", "#0ea5e9", "#78716c", "#64748b", "#fb7185",
];

// Cache for dynamically generated colors
const dynamicColorCache: Record<string, string> = {};

// Generate a consistent color for any country code based on hash
function generateColorForCountry(countryCode: string): string {
  if (!countryCode) return BASE_COUNTRY_COLORS.DEFAULT;

  const code = countryCode.toUpperCase();

  // Check base colors first
  if (BASE_COUNTRY_COLORS[code]) {
    return BASE_COUNTRY_COLORS[code];
  }

  // Check cache
  if (dynamicColorCache[code]) {
    return dynamicColorCache[code];
  }

  // Generate consistent hash from country code
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Get color from palette based on hash
  const colorIndex = Math.abs(hash) % DYNAMIC_COLOR_PALETTE.length;
  const color = DYNAMIC_COLOR_PALETTE[colorIndex];

  // Cache and return
  dynamicColorCache[code] = color;
  return color;
}

// Proxy object to get colors dynamically
export const COUNTRY_COLORS: Record<string, string> = new Proxy(BASE_COUNTRY_COLORS, {
  get(target, prop: string) {
    if (prop === 'DEFAULT') return target.DEFAULT;
    return generateColorForCountry(prop);
  }
});

// Helper to extract country code from router ID (first 3 letters)
export function extractCountryFromId(routerId: string): string {
  if (!routerId) return 'DEFAULT';
  // Extract first 3 letters and uppercase
  const match = routerId.match(/^([a-zA-Z]{3})/);
  if (match) {
    return match[1].toUpperCase();
  }
  return 'DEFAULT';
}

export const NODE_RADIUS = 20;
export const ACTIVE_STROKE_COLOR = "#ffffff";
export const INACTIVE_STROKE_COLOR = "#4b5563"; // Gray 600

export const LINK_COLOR_UP = "#4b5563"; // Gray 600
export const LINK_COLOR_DOWN = "#ef4444"; // Red 500
export const LINK_COLOR_SYMMETRIC = "#10b981"; // Emerald 500 (if we want to highlight symmetry)
export const LINK_COLOR_ASYMMETRIC = "#f97316"; // Orange 500 (for asymmetric routing)

// Empty initial state - app starts with no data, user uploads topology
export const EMPTY_NETWORK_DATA = {
  nodes: [],
  links: [],
  metadata: {
    node_count: 0,
    edge_count: 0,
    data_source: "No topology loaded"
  }
};