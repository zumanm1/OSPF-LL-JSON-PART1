import { NetworkData, NetworkNode, NetworkLink } from '../types';

/**
 * CRITICAL FIX: Validate input data structure before parsing
 * Prevents crashes from malformed data
 */
const validateInputData = (rawData: any): { valid: boolean; error?: string } => {
  if (!rawData || typeof rawData !== 'object') {
    return { valid: false, error: 'Invalid input: data must be an object' };
  }

  // Check for either files array (pyATS format) or nodes/links (direct format)
  const hasFiles = rawData.files && Array.isArray(rawData.files);
  const hasNodesAndLinks = rawData.nodes && Array.isArray(rawData.nodes) &&
                           rawData.links && Array.isArray(rawData.links);

  if (!hasFiles && !hasNodesAndLinks) {
    return {
      valid: false,
      error: 'Invalid input: must have either "files" array or "nodes" and "links" arrays'
    };
  }

  return { valid: true };
};

/**
 * Safely get a string value from potentially malformed data
 */
const safeString = (value: any, defaultValue: string = ''): string => {
  if (value === null || value === undefined) return defaultValue;
  return String(value).trim();
};

/**
 * Safely get a number value from potentially malformed data
 */
const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export const parsePyATSData = (rawData: any): NetworkData => {
  // CRITICAL FIX: Validate input before processing
  const validation = validateInputData(rawData);
  if (!validation.valid) {
    console.error('[Parser] Validation failed:', validation.error);
    return {
      nodes: [],
      links: [],
      timestamp: new Date().toISOString(),
      metadata: {
        node_count: 0,
        edge_count: 0,
        data_source: 'invalid_input',
        snapshot_timestamp: new Date().toISOString(),
        layout_algorithm: 'force_directed',
        parse_error: validation.error
      }
    };
  }

  const nodesMap = new Map<string, NetworkNode>();
  const links: NetworkLink[] = [];

  // Helper to normalize IDs
  const cleanId = (id: string) => id.trim().split('.')[0].toLowerCase();

  // Helper to normalize Interface Names (e.g. FastEthernet0/0 -> Fa0/0)
  const normalizeInterfaceName = (name: string) => {
    return name
        .replace(/^FastEthernet/i, 'Fa')
        .replace(/^GigabitEthernet/i, 'Gi')
        .replace(/^TenGigabitEthernet/i, 'Te')
        .replace(/^Ethernet/i, 'Et')
        .trim();
  };

  // Helper to guess country code from hostname
  const getCountryFromId = (id: string) => {
    if (id.startsWith('zim')) return 'ZIM';
    if (id.startsWith('usa')) return 'USA';
    if (id.startsWith('deu')) return 'DEU';
    if (id.startsWith('gbr')) return 'GBR';
    return 'DEFAULT';
  };

  // 1. First Pass: Initialize nodes from files
  if (rawData.files && Array.isArray(rawData.files)) {
    rawData.files.forEach((file: any) => {
        if (!file.content) return;
        const content = file.content;
        
        // Extract hostname
        const hostnameMatch = content.match(/^hostname\s+([\w.-]+)/m);
        const rawHostname = hostnameMatch ? hostnameMatch[1] : file.filename.replace(/\.(txt|log)$/, '');
        const id = cleanId(rawHostname);

        // Extract Loopback IP (from "show ip interface brief" or explicit config)
        const loopbackMatch = content.match(/Loopback0\s+([\d.]+)/) || content.match(/interface Loopback0\n\s+ip address\s+([\d.]+)/);
        const loopback_ip = loopbackMatch ? loopbackMatch[1] : 'Unknown';

        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            name: id,
            hostname: rawHostname,
            loopback_ip,
            country: getCountryFromId(id),
            is_active: true,
            node_type: 'router',
            neighbor_count: 0
          });
        }
      });

    // 2. Second Pass: Process connections and neighbors
    rawData.files.forEach((file: any) => {
        if (!file.content) return;
        const content = file.content;
        
        const hostnameMatch = content.match(/^hostname\s+([\w.-]+)/m);
        const rawHostname = hostnameMatch ? hostnameMatch[1] : file.filename.replace(/\.(txt|log)$/, '');
        const sourceId = cleanId(rawHostname);

        // Parse Interface Costs from OSPF configuration to use as link weights
        const interfaceCosts = new Map<string, number>();
        
        // Strategy 1: OSPF Interface Brief
        // matches: Fa2/0 ... 900 ...
        const costBriefRegex = /^([A-Za-z]+\d+[\/\d]*)\s+\d+\s+\d+\s+[\d\.]+\/\d+\s+(\d+)\s+/gm;
        let match;
        while ((match = costBriefRegex.exec(content)) !== null) {
            interfaceCosts.set(normalizeInterfaceName(match[1]), parseInt(match[2], 10));
        }
        
        // Strategy 2: OSPF Interface Detailed
        // matches: FastEthernet2/0 is up,.*Cost: 900
        const costDetailRegex = /^([A-Za-z]+\d+[\/\d]*)\s+is up,.*Cost: (\d+)/gm;
        while ((match = costDetailRegex.exec(content)) !== null) {
             interfaceCosts.set(normalizeInterfaceName(match[1]), parseInt(match[2], 10));
        }

        // Strategy 3: Configuration Style (interface ... ip ospf cost)
        const lines = content.split('\n');
        let currentInt = '';
        lines.forEach(line => {
            const intMatch = line.match(/^interface\s+([\w\/\.-]+)/);
            if (intMatch) {
                currentInt = normalizeInterfaceName(intMatch[1]);
            }
            const costMatch = line.match(/^\s*ip ospf cost\s+(\d+)/);
            if (currentInt && costMatch) {
                 interfaceCosts.set(currentInt, parseInt(costMatch[1], 10));
            }
        });

        // Parse CDP Neighbors
        // Content is usually split by dashes
        const chunks = content.split('-------------------------');
        chunks.forEach((chunk: string) => {
           const deviceIdMatch = chunk.match(/Device ID:\s+([\w.-]+)/);
           if (!deviceIdMatch) return;
           
           const targetId = cleanId(deviceIdMatch[1]);
           if (sourceId === targetId) return;

           // If we discover a neighbor we don't have a file for, create a placeholder node
           if (!nodesMap.has(targetId)) {
               nodesMap.set(targetId, {
                   id: targetId,
                   name: targetId,
                   hostname: deviceIdMatch[1],
                   loopback_ip: 'Unknown',
                   country: getCountryFromId(targetId),
                   is_active: false, // Inferred node
                   node_type: 'unknown',
                   neighbor_count: 0
               });
           }

           const localIntMatch = chunk.match(/Interface:\s+([\w\/\s]+),/);
           const remoteIntMatch = chunk.match(/Port ID.*:\s+([\w\/\s]+)/);
           
           if (localIntMatch && remoteIntMatch) {
               const rawLocalInt = localIntMatch[1].trim();
               const rawRemoteInt = remoteIntMatch[1].trim();
               
               const localInt = normalizeInterfaceName(rawLocalInt);
               const remoteInt = normalizeInterfaceName(rawRemoteInt);

               const cost = interfaceCosts.get(localInt) || 10;

               // Check if this link (or its reverse) is already recorded
               const existingLinkIndex = links.findIndex(l => {
                    // Exact match (Source -> Target)
                    if (l.source === sourceId && l.target === targetId && 
                        normalizeInterfaceName(l.source_interface) === localInt) return true;
                    // Reverse match (Target -> Source)
                    if (l.source === targetId && l.target === sourceId && 
                        normalizeInterfaceName(l.target_interface) === localInt) return true;
                    return false;
               });

               if (existingLinkIndex === -1) {
                   // New Link - create with forward_cost and reverse_cost
                   links.push({
                       source: sourceId,
                       target: targetId,
                       source_interface: rawLocalInt,
                       target_interface: rawRemoteInt,
                       forward_cost: cost,
                       reverse_cost: cost, // Default to symmetric until we see reverse direction
                       cost: cost, // Legacy field for backward compatibility
                       original_cost: cost,
                       original_forward_cost: cost,
                       original_reverse_cost: cost,
                       status: 'up'
                   });

                   // Update neighbor stats
                   const sNode = nodesMap.get(sourceId);
                   if(sNode) sNode.neighbor_count = (sNode.neighbor_count || 0) + 1;
                   const tNode = nodesMap.get(targetId);
                   if(tNode) tNode.neighbor_count = (tNode.neighbor_count || 0) + 1;
               } else {
                   // Link already exists - this is the reverse direction
                   const existingLink = links[existingLinkIndex];
                   
                   // CRITICAL FIX: If existing link is Target->Source, we're seeing Source->Target now
                   // We need to update the forward_cost of the existing link (which is actually Target->Source direction)
                   // and set reverse_cost to the cost we just discovered
                   if (existingLink.source === targetId && existingLink.target === sourceId) {
                       // The existing link represents Target->Source with forward_cost
                       // We just discovered Source->Target cost, so update reverse_cost accordingly
                       existingLink.reverse_cost = existingLink.forward_cost;  // Preserve original forward as reverse
                       existingLink.original_reverse_cost = existingLink.original_forward_cost;
                       
                       // Update forward_cost to our newly discovered cost (Source->Target direction)
                       existingLink.forward_cost = cost;
                       existingLink.original_forward_cost = cost;
                       
                       // Update legacy cost field to match the new forward cost
                       existingLink.cost = cost;
                       existingLink.original_cost = cost;
                   }
                   // If existing link is Source->Target (exact duplicate), skip it
               }
           }
        });
    });
  }

  const ts = rawData.timestamp || new Date().toISOString();

  return {
    nodes: Array.from(nodesMap.values()),
    links,
    timestamp: ts,
    metadata: {
        node_count: nodesMap.size,
        edge_count: links.length,
        data_source: rawData.source || 'pyats_import',
        snapshot_timestamp: ts,
        layout_algorithm: 'force_directed'
    }
  };
};