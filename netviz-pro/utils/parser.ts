import { NetworkData, NetworkNode, NetworkLink } from '../types';

export const parsePyATSData = (rawData: any): NetworkData => {
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
                   
                   // If existing link is Target->Source, we're seeing Source->Target now
                   if (existingLink.source === targetId && existingLink.target === sourceId) {
                       // Update the reverse cost of the existing link with our forward cost
                       existingLink.reverse_cost = cost;
                       existingLink.original_reverse_cost = cost;
                       // Keep legacy cost field as forward cost
                       existingLink.cost = existingLink.forward_cost;
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