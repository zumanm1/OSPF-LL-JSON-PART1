import React from 'react';
import { NetworkLink, NetworkNode } from '../types';
import { X, Activity, ArrowLeftRight, Router, ArrowRight } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';

interface LinkDetailsPanelProps {
  link: NetworkLink | null;
  onClose: () => void;
}

const LinkDetailsPanel: React.FC<LinkDetailsPanelProps> = ({ link, onClose }) => {
  if (!link) return null;

  const getNode = (nodeOrId: string | NetworkNode): NetworkNode => {
     if (typeof nodeOrId === 'object') return nodeOrId;
     // Fallback if only ID is present (should not happen with D3 processed data)
     return { id: nodeOrId, hostname: nodeOrId, country: 'DEFAULT', is_active: true, node_type: 'router', loopback_ip: 'N/A' } as NetworkNode;
  };

  const source = getNode(link.source);
  const target = getNode(link.target);

  const isUp = link.status === 'up';
  const isModified = link.is_modified;

  return (
    <div className="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 z-20">
      {/* Header */}
      <div className="relative h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center border-b border-gray-700">
         <div className="absolute top-2 right-2">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
         </div>
         
         {/* Visual Connection */}
         <div className="flex items-center gap-4 mt-2">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border-2 border-gray-700 flex items-center justify-center text-white font-bold text-xs shadow-lg" style={{ backgroundColor: COUNTRY_COLORS[source.country] }}>
                    {source.id.substring(0,2)}
                </div>
            </div>
            <div className="flex flex-col items-center text-gray-500">
                <span className="text-[10px] font-mono mb-1">{link.cost}</span>
                <ArrowLeftRight className="w-5 h-5" />
            </div>
             <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border-2 border-gray-700 flex items-center justify-center text-white font-bold text-xs shadow-lg" style={{ backgroundColor: COUNTRY_COLORS[target.country] }}>
                    {target.id.substring(0,2)}
                </div>
            </div>
         </div>
         <div className="flex items-center gap-8 w-full px-8 mt-2 text-xs text-gray-400 font-mono">
            <span className="flex-1 text-center truncate">{source.hostname}</span>
            <span className="flex-1 text-center truncate">{target.hostname}</span>
         </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        
        {/* Status Indicator */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${isUp ? 'bg-green-900/10 border-green-800/50' : 'bg-red-900/10 border-red-800/50'}`}>
            <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isUp ? 'text-green-400' : 'text-red-400'}`} />
                <span className={`text-sm font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? 'LINK UP' : 'LINK DOWN'}
                </span>
            </div>
            {isModified && (
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold border border-purple-500/30 px-2 py-0.5 rounded bg-purple-500/10">
                    Simulated
                </span>
            )}
        </div>

        {/* Interface Details */}
        <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase font-semibold ml-1">Interfaces</p>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-gray-700/50">
                     <div className="flex items-center gap-2">
                        <Router className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-gray-300">{source.id}</span>
                     </div>
                     <span className="text-sm font-mono text-white">{link.source_interface}</span>
                </div>
                 <div className="flex justify-between items-center p-3">
                     <div className="flex items-center gap-2">
                        <Router className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-gray-300">{target.id}</span>
                     </div>
                     <span className="text-sm font-mono text-white">{link.target_interface}</span>
                </div>
            </div>
        </div>

        {/* Metrics Details */}
        <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase font-semibold ml-1">OSPF Metrics</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                    <span className="text-[10px] text-gray-500 block mb-1">Forward Cost</span>
                    <div className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <span className="text-lg font-bold text-white">{link.forward_cost || link.cost}</span>
                    </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                    <span className="text-[10px] text-gray-500 block mb-1">Reverse Cost</span>
                    <div className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-gray-600 rotate-180" />
                        <span className="text-lg font-bold text-white">{link.reverse_cost || link.cost}</span>
                    </div>
                </div>
            </div>
            {link.forward_cost !== link.reverse_cost && (
                <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-1 ml-1">
                    <Activity className="w-3 h-3" />
                    Asymmetric Routing Detected
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default LinkDetailsPanel;