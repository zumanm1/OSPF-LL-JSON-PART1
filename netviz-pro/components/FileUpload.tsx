import React, { useRef } from 'react';
import { Upload, FileJson, Terminal } from 'lucide-react';
import { NetworkData } from '../types';
import { parsePyATSData } from '../utils/parser';

interface FileUploadProps {
  onDataLoaded: (data: NetworkData) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        let processedData: NetworkData;

        // Check for PyATS format (contains 'files' array)
        if (json.files && Array.isArray(json.files)) {
          console.log("Detected PyATS format, parsing...");
          processedData = parsePyATSData(json);
          // Update metadata source
          if (!processedData.metadata) processedData.metadata = {};
          processedData.metadata.data_source = `Uploaded: ${file.name} (PyATS)`;
        }
        // Check for format with physical_links (new database export format)
        else if (json.nodes && Array.isArray(json.nodes) && json.physical_links && Array.isArray(json.physical_links)) {
          console.log("Detected physical_links format, converting...");

          // Convert nodes: map 'status' to 'is_active', 'hostname' to 'loopback_ip'
          const convertedNodes = json.nodes.map((node: any) => ({
            ...node,
            is_active: node.status === 'up' || node.is_active === true,
            loopback_ip: node.loopback_ip || node.hostname || 'Unknown',
            neighbor_count: node.neighbor_count || 0,
          }));

          // Convert physical_links to standard link format with asymmetric costs
          const convertedLinks = json.physical_links.map((plink: any) => ({
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
            timestamp: json.timestamp || new Date().toISOString(),
            metadata: {
              ...json.metadata,
              data_source: `Uploaded: ${file.name} (physical_links)`,
              asymmetric_count: json.metadata?.asymmetric_count || convertedLinks.filter((l: any) => l.is_asymmetric).length,
            }
          };
        }
        // Check for Standard NetworkData format
        else if (json.nodes && Array.isArray(json.nodes)) {
          // Convert nodes: ensure is_active exists
          const convertedNodes = json.nodes.map((node: any) => ({
            ...node,
            is_active: node.status === 'up' || node.is_active === true || node.is_active === undefined,
            loopback_ip: node.loopback_ip || node.hostname || 'Unknown',
          }));

          // Process links to detect asymmetric costs from directional links
          let links = json.links || [];

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
            timestamp: json.timestamp,
            metadata: {
              ...json.metadata,
              data_source: `Uploaded: ${file.name}`,
            }
          };
        } else {
          alert("Invalid JSON structure. Must contain a 'nodes' array or 'files' array (PyATS).");
          return;
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
        </div>
      </div>
    </div>
  );
};

export default FileUpload;