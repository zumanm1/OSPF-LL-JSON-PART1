import { NetworkNode, RouterRole, HostnameMapping, HostnameMappingConfig } from '../types';

/**
 * Parse a new-format hostname to extract components
 * Format: {country}-{city}-{site}-{role}{number}
 * Example: deu-ber-bes-pe10 -> { country: 'DEU', city: 'ber', site: 'bes', role: 'PE', number: '10' }
 */
export interface ParsedHostname {
  country: string;
  city?: string;
  site?: string;
  role?: RouterRole;
  number?: string;
  isNewFormat: boolean;
}

/**
 * Detect router role from hostname pattern
 * Supports patterns like: pe10, p06, rr08, ce01, etc.
 */
export function detectRoleFromHostname(hostname: string): RouterRole {
  const lower = hostname.toLowerCase();
  
  // Check for role patterns at the end of hostname
  // Pattern: role prefix followed by digits
  const rolePatterns: { pattern: RegExp; role: RouterRole }[] = [
    { pattern: /[^a-z]pe\d+$/i, role: 'PE' },
    { pattern: /[^a-z]p\d+$/i, role: 'P' },
    { pattern: /[^a-z]rr\d+$/i, role: 'RR' },
    { pattern: /[^a-z]ce\d+$/i, role: 'CE' },
    { pattern: /[^a-z]abr\d+$/i, role: 'ABR' },
    { pattern: /[^a-z]asbr\d+$/i, role: 'ASBR' },
    // Also check if hostname starts with role (for short formats)
    { pattern: /^pe\d+$/i, role: 'PE' },
    { pattern: /^p\d+$/i, role: 'P' },
    { pattern: /^rr\d+$/i, role: 'RR' },
  ];

  for (const { pattern, role } of rolePatterns) {
    if (pattern.test(lower)) {
      return role;
    }
  }

  // Check for role in the middle of hostname (e.g., deu-ber-bes-pe10)
  if (/-pe\d+/i.test(lower)) return 'PE';
  if (/-p\d+/i.test(lower) && !/-pe\d+/i.test(lower)) return 'P';
  if (/-rr\d+/i.test(lower)) return 'RR';
  if (/-ce\d+/i.test(lower)) return 'CE';
  if (/-abr\d+/i.test(lower)) return 'ABR';
  if (/-asbr\d+/i.test(lower)) return 'ASBR';

  return 'unknown';
}

/**
 * Parse a hostname into its components
 * Supports multiple formats:
 * - New format: country-city-site-role+number (e.g., deu-ber-bes-pe10)
 * - 3-part format: country-city-role+number (e.g., usa-nyc-pe05)
 * - Old format: country-rN (e.g., deu-r10)
 * - Simple format: just a hostname with country prefix
 */
export function parseHostname(hostname: string): ParsedHostname {
  const parts = hostname.toLowerCase().split('-');
  
  // Try to detect role pattern in the last part
  const lastPart = parts[parts.length - 1];
  const roleMatch = lastPart.match(/^(pe|p|rr|ce|abr|asbr)(\d+)$/i);
  const routerMatch = lastPart.match(/^r(\d+)$/i);
  
  // New format: country-city-site-role+number (4 parts)
  // Example: deu-ber-bes-pe10
  if (parts.length === 4 && roleMatch) {
    return {
      country: parts[0].toUpperCase(),
      city: parts[1],
      site: parts[2],
      role: roleMatch[1].toUpperCase() as RouterRole,
      number: roleMatch[2],
      isNewFormat: true,
    };
  }
  
  // 3-part format: country-city-role+number OR country-site-role+number
  // Example: usa-nyc-pe05, gbr-ldn-p07
  if (parts.length === 3 && roleMatch) {
    return {
      country: parts[0].toUpperCase(),
      city: parts[1],
      role: roleMatch[1].toUpperCase() as RouterRole,
      number: roleMatch[2],
      isNewFormat: true,
    };
  }
  
  // Old format: country-rN (2 parts)
  // Example: deu-r10
  if (parts.length === 2 && routerMatch) {
    return {
      country: parts[0].toUpperCase(),
      number: routerMatch[1],
      isNewFormat: false,
    };
  }
  
  // 2-part format with role: country-role+number
  // Example: deu-pe10
  if (parts.length === 2 && roleMatch) {
    return {
      country: parts[0].toUpperCase(),
      role: roleMatch[1].toUpperCase() as RouterRole,
      number: roleMatch[2],
      isNewFormat: true,
    };
  }
  
  // Generic multi-part: assume first part is country, try to extract info from rest
  if (parts.length >= 2) {
    const result: ParsedHostname = {
      country: parts[0].toUpperCase(),
      isNewFormat: parts.length > 2,
    };
    
    // If we have 3+ parts, second is likely city
    if (parts.length >= 3) {
      result.city = parts[1];
    }
    
    // If we have 4+ parts, third is likely site
    if (parts.length >= 4) {
      result.site = parts[2];
    }
    
    // Try to extract role from any part
    for (const part of parts) {
      const partRoleMatch = part.match(/^(pe|p|rr|ce|abr|asbr)(\d*)$/i);
      if (partRoleMatch) {
        result.role = partRoleMatch[1].toUpperCase() as RouterRole;
        if (partRoleMatch[2]) result.number = partRoleMatch[2];
        break;
      }
    }
    
    return result;
  }

  // Fallback: try to extract country from first 3 chars
  return {
    country: hostname.substring(0, 3).toUpperCase(),
    isNewFormat: false,
  };
}

/**
 * Create a hostname mapping from old to new format
 */
export function createHostnameMapping(
  oldHostname: string,
  newHostname: string,
  role: RouterRole
): HostnameMapping {
  return {
    old_hostname: oldHostname.toLowerCase(),
    new_hostname: newHostname.toLowerCase(),
    role,
  };
}

/**
 * Parse a hostname mapping table (tab or space separated)
 * Format: "old_hostname\trole\tnew_hostname" per line
 * Example:
 * deu-r10    PE    deu-ber-bes-pe10
 * deu-r6     P     deu-ber-bes-p06
 */
export function parseHostnameMappingTable(tableText: string): HostnameMappingConfig {
  const lines = tableText.trim().split('\n');
  const mappings: HostnameMapping[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    // Split by tabs or multiple spaces
    const parts = trimmedLine.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
    
    if (parts.length >= 3) {
      const [oldHostname, roleStr, newHostname] = parts;
      const role = roleStr.toUpperCase() as RouterRole;
      
      if (['PE', 'P', 'RR', 'CE', 'ABR', 'ASBR'].includes(role)) {
        mappings.push({
          old_hostname: oldHostname.toLowerCase(),
          new_hostname: newHostname.toLowerCase(),
          role,
        });
      }
    }
  }

  return { mappings, auto_detect_role: true };
}

/**
 * Apply hostname mapping to a network node
 */
export function applyHostnameMapping(
  node: NetworkNode,
  mappingConfig: HostnameMappingConfig
): NetworkNode {
  const nodeId = node.id.toLowerCase();
  const nodeHostname = node.hostname.toLowerCase();
  
  // Find matching mapping
  const mapping = mappingConfig.mappings.find(
    m => m.old_hostname === nodeId || m.old_hostname === nodeHostname
  );

  if (mapping) {
    // Parse the new hostname to extract city/site info
    const parsed = parseHostname(mapping.new_hostname);
    
    return {
      ...node,
      original_hostname: node.hostname,
      hostname: mapping.new_hostname,
      role: mapping.role,
      city: parsed.city,
      site: parsed.site,
    };
  }

  // No mapping found - try to auto-detect role from current hostname
  if (mappingConfig.auto_detect_role) {
    const detectedRole = detectRoleFromHostname(node.hostname);
    if (detectedRole !== 'unknown') {
      return {
        ...node,
        role: detectedRole,
      };
    }
  }

  return node;
}

/**
 * Apply hostname mappings to all nodes in the network
 */
export function applyHostnameMappings(
  nodes: NetworkNode[],
  mappingConfig: HostnameMappingConfig
): NetworkNode[] {
  return nodes.map(node => applyHostnameMapping(node, mappingConfig));
}

/**
 * Generate display label for a node based on settings
 */
export function getNodeDisplayLabel(
  node: NetworkNode,
  options: {
    showRole?: boolean;
    showCity?: boolean;
    useNewHostname?: boolean;
  } = {}
): string {
  const { showRole = true, showCity = false, useNewHostname = true } = options;
  
  let label = useNewHostname ? node.hostname : (node.original_hostname || node.hostname);
  
  if (showRole && node.role && node.role !== 'unknown') {
    label = `[${node.role}] ${label}`;
  }
  
  return label;
}

/**
 * Get role color for visual distinction
 */
export function getRoleColor(role?: RouterRole): string {
  switch (role) {
    case 'PE': return '#3b82f6'; // Blue - Provider Edge
    case 'P': return '#10b981';  // Green - Provider
    case 'RR': return '#8b5cf6'; // Purple - Route Reflector
    case 'CE': return '#f59e0b'; // Amber - Customer Edge
    case 'ABR': return '#ec4899'; // Pink - Area Border Router
    case 'ASBR': return '#ef4444'; // Red - AS Border Router
    default: return '#6b7280';   // Gray - Unknown
  }
}

/**
 * Get role badge style for UI display
 */
export function getRoleBadgeStyle(role?: RouterRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'PE':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-600/30' };
    case 'P':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-600/30' };
    case 'RR':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-600/30' };
    case 'CE':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-600/30' };
    case 'ABR':
      return { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-600/30' };
    case 'ASBR':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-600/30' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-600' };
  }
}

// Default hostname mapping for the provided router list
export const DEFAULT_HOSTNAME_MAPPINGS: HostnameMappingConfig = {
  mappings: [
    { old_hostname: 'deu-r10', new_hostname: 'deu-ber-bes-pe10', role: 'PE' },
    { old_hostname: 'deu-r6', new_hostname: 'deu-ber-bes-p06', role: 'P' },
    { old_hostname: 'gbr-r7', new_hostname: 'gbr-ldn-wst-p07', role: 'P' },
    { old_hostname: 'gbr-r9', new_hostname: 'gbr-ldn-wst-pe09', role: 'PE' },
    { old_hostname: 'usa-r5', new_hostname: 'usa-nyc-dc1-pe05', role: 'PE' },
    { old_hostname: 'usa-r8', new_hostname: 'usa-nyc-dc1-rr08', role: 'RR' },
    { old_hostname: 'zwe-r1', new_hostname: 'zwe-hra-pop-p01', role: 'P' },
    { old_hostname: 'zwe-r2', new_hostname: 'zwe-hra-pop-p02', role: 'P' },
    { old_hostname: 'zwe-r3', new_hostname: 'zwe-bul-pop-p03', role: 'P' },
    { old_hostname: 'zwe-r4', new_hostname: 'zwe-bul-pop-p04', role: 'P' },
  ],
  auto_detect_role: true,
};
