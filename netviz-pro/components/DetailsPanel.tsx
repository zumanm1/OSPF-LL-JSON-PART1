import React from 'react';
import { NetworkNode } from '../types';
import { X, Server, Globe, Activity, Network, MapPin, ArrowRight } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';

interface DetailsPanelProps {
  node: NetworkNode | null;
  onClose: () => void;
  onSetSource?: (node: NetworkNode) => void;
  onSetDest?: (node: NetworkNode) => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ node, onClose, onSetSource, onSetDest }) => {
  if (!node) return null;

  const color = COUNTRY_COLORS[node.country] || COUNTRY_COLORS.DEFAULT;

  return (
    <div className="absolute top-4 right-4 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 z-20">
      <div className="relative h-20 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
         <div className="absolute top-2 right-2">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
         </div>
         <div 
            className="w-16 h-16 rounded-full border-4 border-gray-800 flex items-center justify-center text-white font-bold text-xl shadow-lg mt-8"
            style={{ backgroundColor: color }}
         >
            {node.id.substring(0,2)}
         </div>
      </div>

      <div className="px-6 pt-10 pb-6 space-y-6">
        <div className="text-center">
            <h2 className="text-xl font-bold text-white">{node.hostname}</h2>
            <p className="text-sm text-gray-400 flex items-center justify-center gap-1 mt-1">
                <span className={`w-2 h-2 rounded-full ${node.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {node.is_active ? 'Active' : 'Inactive'} • {node.node_type}
            </p>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                <Server className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">IP Address</p>
                    <p className="text-gray-200 font-mono text-sm">{node.loopback_ip}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                <Globe className="w-5 h-5 text-emerald-400" />
                <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
                    <p className="text-gray-200 font-medium">{node.country}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                <Network className="w-5 h-5 text-purple-400" />
                <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Port</p>
                    <p className="text-gray-200 font-medium">{node.port || 'N/A'}</p>
                </div>
            </div>
            
             <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                <Activity className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Neighbors</p>
                    <p className="text-gray-200 font-medium">{node.neighbor_count || 0}</p>
                </div>
            </div>
        </div>

        {/* Path Analysis Actions */}
        {(onSetSource || onSetDest) && (
            <div className="pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Path Analysis</p>
                <div className="grid grid-cols-2 gap-2">
                    {onSetSource && (
                        <button 
                            onClick={() => onSetSource(node)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-200 rounded-lg text-xs font-medium transition-colors border border-blue-600/30"
                        >
                            <MapPin className="w-3 h-3" />
                            Set Source
                        </button>
                    )}
                    {onSetDest && (
                        <button 
                            onClick={() => onSetDest(node)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-200 rounded-lg text-xs font-medium transition-colors border border-emerald-600/30"
                        >
                            <ArrowRight className="w-3 h-3" />
                            Set Dest
                        </button>
                    )}
                </div>
            </div>
        )}

        {node.index !== undefined && (
             <div className="pt-2 text-center">
                <span className="text-[10px] text-gray-600 font-mono">Node Index: {node.index} • ID: {node.id}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;