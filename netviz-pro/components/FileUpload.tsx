import React, { useRef } from 'react';
import { Upload, FileJson, Terminal } from 'lucide-react';
import { NetworkData, HostnameMappingConfig } from '../types';
import { parsePyATSData } from '../utils/parser';
import { applyHostnameMappings, detectRoleFromHostname, parseHostname } from '../utils/hostnameMapper';

// CRITICAL PRODUCTION SECURITY: Schema validation function
const validateTopologySchema = (json: any): boolean => {
  // Check for PyATS format
  if (json.files && Array.isArray(json.files)) {
    return json.files.every((file: any) => 
      typeof file === 'object' && 
      typeof file.filename === 'string' && 
      typeof file.content === 'string'
    );
  }
  
  // Check for direct topology format
  if (json.nodes && Array.isArray(json.nodes) && json.links && Array.isArray(json.links)) {
    // Validate nodes
    if (json.nodes.length === 0) return false;
    if (!json.nodes.every((node: any) => 
      typeof node.id === 'string' && 
      typeof node.name === 'string' && 
      typeof node.hostname === 'string'
    )) return false;
    
    // Validate links
    return json.links.every((link: any) => 
      typeof link.source === 'string' && 
      typeof link.target === 'string'
    );
  }
  
  // Check for OSPF Designer format
  if (json.type === 'ospf-topology' && json.data && json.data.nodes && json.data.links) {
    return validateTopologySchema(json.data);
  }
  
  return false;
};

interface FileUploadProps {
  onDataLoaded: (data: NetworkData) => void;
  hostnameMappingConfig?: HostnameMappingConfig;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, hostnameMappingConfig }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // CRITICAL PRODUCTION SECURITY: File size validation (prevent DoS)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    // CRITICAL PRODUCTION SECURITY: File type validation
    const ALLOWED_TYPES = ['application/json', 'text/plain'];
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.json')) {
      alert('Invalid file type. Only JSON files are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawContent = e.target?.result as string;
        
        // CRITICAL PRODUCTION SECURITY: Content size validation
        if (rawContent.length > 50 * 1024 * 1024) { // 50MB JSON content limit
          alert('JSON content too large. Maximum is 50MB.');
          return;
        }

        // CRITICAL PRODUCTION SECURITY: Safe JSON parsing with prototype pollution protection
        let json;
        try {
          json = JSON.parse(rawContent);
        } catch (parseError) {
          alert('Invalid JSON format. Please check your file.');
          return;
        }

        // CRITICAL PRODUCTION SECURITY: Prototype pollution prevention
        if (json.__proto__ !== Object.prototype || 
            json.constructor !== Object ||
            json.hasOwnProperty('__proto__') ||
            json.hasOwnProperty('constructor') ||
            json.hasOwnProperty('prototype')) {
          alert('Invalid JSON structure. Prototype pollution detected.');
          return;
        }

        // CRITICAL PRODUCTION SECURITY: Deep freeze to prevent prototype pollution
        const sanitizedJson = JSON.parse(JSON.stringify(json));
        Object.freeze(sanitizedJson);

        // CRITICAL PRODUCTION SECURITY: Schema validation
        if (!validateTopologySchema(sanitizedJson)) {
          alert('Invalid topology schema. Required fields missing or malformed.');
          return;
        }

        let processedData: NetworkData;

        // Check for PyATS format (contains 'files' array)
        if (sanitizedJson.files && Array.isArray(sanitizedJson.files)) {
          console.log("Detected PyATS format, parsing...");
          processedData = parsePyATSData(sanitizedJson);
          // Update metadata source
          if (!processedData.metadata) processedData.metadata = {};
          processedData.metadata.data_source = `Uploaded: ${file.name} (PyATS)`;
        }
        // Check for OSPF Designer format (data nested under 'data' property)
        else if (sanitizedJson.type === 'ospf-topology' && sanitizedJson.data && sanitizedJson.data.nodes && Array.isArray(sanitizedJson.data.nodes)) {
          console.log("Detected OSPF Designer format, parsing...");
          const designerData = sanitizedJson.data;

          // Convert nodes - they are already in standard format
          const convertedNodes = designerData.nodes.map((node: any) => ({
            ...node,
            is_active: node.is_active !== false,
            loopback_ip: node.loopback_ip || 'Unknown',
            neighbor_count: node.neighbor_count || 0,
          }));

          // Convert links - add interface placeholders and ensure all cost fields
          const convertedLinks = (designerData.links || []).map((link: any, index: number) => ({
            source: link.source,
            target: link.target,
            source_interface: link.source_interface || `Gi0/${index}`,
            target_interface: link.target_interface || `Gi0/${index}`,
            forward_cost: link.forward_cost || link.cost || 10,
            reverse_cost: link.reverse_cost || link.cost || 10,
            cost: link.forward_cost || link.cost || 10,
            original_cost: link.forward_cost || link.cost || 10,
            original_forward_cost: link.forward_cost || link.cost || 10,
            original_reverse_cost: link.reverse_cost || link.cost || 10,
            is_asymmetric: (link.forward_cost !== link.reverse_cost),
            status: link.status || 'up',
          }));

          processedData = {
            nodes: convertedNodes,
            links: convertedLinks,
            timestamp: sanitizedJson.exportedAt || new Date().toISOString(),
            metadata: {
              node_count: convertedNodes.length,
              edge_count: convertedLinks.length,
              data_source: `Uploaded: ${file.name} (OSPF Designer)`,
              asymmetric_count: convertedLinks.filter((l: any) => l.is_asymmetric).length,
              ...designerData.metadata,
            }
          };
        }
        // Check for format with physical_links (new database export format)
        else if (sanitizedJson.nodes && Array.isArray(sanitizedJson.nodes) && sanitizedJson.physical_links && Array.isArray(sanitizedJson.physical_links)) {
          console.log("Detected physical_links format, converting...");

          // Convert nodes: map 'status' to 'is_active', 'hostname' to 'loopback_ip'
          const convertedNodes = sanitizedJson.nodes.map((node: any) => ({
            ...node,
            is_active: node.status === 'up' || node.is_active === true,
            loopback_ip: node.loopback_ip || node.hostname || 'Unknown',
            neighbor_count: node.neighbor_count || 0,
          }));

          // Convert physical_links to standard link format with asymmetric costs
          const convertedLinks = sanitizedJson.physical_links.map((plink: any) => ({
            source: plink.router_a,
            target: plink.router_b,
            source_interface: plink.interface_a || 'Unknown',
            target_interface: plink.interface_b || 'Unknown',
            cost: plink.cost_a_to_b,
            reverse_cost: plink.cost_b_to_a,
            forward_cost: plink.cost_a_to_b,
            is_asymmetric: plink.is_asymmetric || (plink.cost_a_to_b !== plink.cost_b_to_a),
            status: plink.status || 'up',
          }));

          processedData = {
            nodes: convertedNodes,
            links: convertedLinks,
            timestamp: sanitizedJson.timestamp || new Date().toISOString(),
            metadata: {
              ...sanitizedJson.metadata,
              data_source: `Uploaded: ${file.name} (physical_links)`,
              asymmetric_count: sanitizedJson.metadata?.asymmetric_count || convertedLinks.filter((l: any) => l.is_asymmetric).length,
            }
          };
        }
        // Check for Standard NetworkData format
        else if (sanitizedJson.nodes && Array.isArray(sanitizedJson.nodes)) {
          // Convert nodes: ensure is_active exists
          const convertedNodes = sanitizedJson.nodes.map((node: any) => ({
            ...node,
            is_active: node.status === 'up' || node.is_active === true || node.is_active === undefined,
            loopback_ip: node.loopback_ip || node.hostname || 'Unknown',
          }));

          // Process links to detect asymmetric costs from directional links
          let links = sanitizedJson.links || [];

          // If links have directional format (A->B and B->A as separate entries), consolidate
          if (links.length > 0 && !links[0].reverse_cost) {
            const linkMap = new Map<string, any>();

            links.forEach((link: any) => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const key1 = `${sourceId}-${targetId}`;
              const key2 = `${targetId}-${sourceId}`;

              if (linkMap.has(key2)) {
                // Found reverse link - update with reverse cost
                const existingLink = linkMap.get(key2);
                existingLink.reverse_cost = link.cost;
                existingLink.is_asymmetric = existingLink.cost !== link.cost;
              } else if (!linkMap.has(key1)) {
                // New link
                linkMap.set(key1, {
                  ...link,
                  forward_cost: link.cost,
                  reverse_cost: link.cost, // Default to symmetric, will be updated if reverse found
                  is_asymmetric: false,
                });
              }
            });

            links = Array.from(linkMap.values());
          }

          processedData = {
            nodes: convertedNodes,
            links: links,
            timestamp: sanitizedJson.timestamp,
            metadata: {
              ...sanitizedJson.metadata,
              data_source: `Uploaded: ${file.name}`,
            }
          };
        } else {
          alert("Invalid JSON structure. Supported formats:\n• Standard topology (nodes + links arrays)\n• PyATS format (files array)\n• OSPF Designer (type: 'ospf-topology' with data.nodes)\n• Database export (nodes + physical_links)");
          return;
        }

        // Apply hostname mappings if configured
        if (hostnameMappingConfig && hostnameMappingConfig.mappings.length > 0) {
          processedData.nodes = applyHostnameMappings(processedData.nodes, hostnameMappingConfig);
        } else {
          // Auto-detect roles from hostnames even without explicit mapping
          processedData.nodes = processedData.nodes.map(node => {
            const parsed = parseHostname(node.hostname);
            const role = detectRoleFromHostname(node.hostname);
            return {
              ...node,
              role: role !== 'unknown' ? role : node.role,
              city: parsed.city || node.city,
              site: parsed.site || node.site,
            };
          });
        }

        onDataLoaded(processedData);

      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className="relative group cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 rounded-xl p-6 transition-all duration-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/json"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">
        <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium text-center">Click to upload<br />Topology or Logs</span>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <FileJson className="w-3 h-3" />
            <span>.json</span>
          </div>
          <div className="flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            <span>PyATS</span>
          </div>
          <div className="flex items-center gap-1">
            <FileJson className="w-3 h-3" />
            <span>Designer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;