import React, { useState, useEffect } from 'react';
import { NetworkLink, NetworkNode } from '../types';
import { X, Save, RotateCcw, Power, Activity, Network } from 'lucide-react';

interface LinkEditPanelProps {
    link: NetworkLink | null;
    onClose: () => void;
    onUpdate: (linkIndex: number, newCost: number, newReverseCost: number | undefined, newStatus: string) => void;
}

const LinkEditPanel: React.FC<LinkEditPanelProps> = ({ link, onClose, onUpdate }) => {
    const [forwardCost, setForwardCost] = useState<number>(0);
    const [reverseCost, setReverseCost] = useState<number>(0);
    const [status, setStatus] = useState<string>('up');

    useEffect(() => {
        if (link) {
            // Use forward_cost if available, fallback to legacy cost
            setForwardCost(link.forward_cost !== undefined ? link.forward_cost : (link.cost || 0));
            setReverseCost(link.reverse_cost !== undefined ? link.reverse_cost : (link.forward_cost || link.cost || 0));
            setStatus(link.status);
        }
    }, [link]);

    if (!link || link.index === undefined) return null;

    const getHostname = (nodeOrId: string | NetworkNode) => {
        return typeof nodeOrId === 'object' ? nodeOrId.hostname : nodeOrId;
    };

    const handleSave = () => {
        onUpdate(link.index!, forwardCost, reverseCost, status);
        onClose();
    };

    const handleReset = () => {
        if (link.original_forward_cost !== undefined) {
            setForwardCost(link.original_forward_cost);
        } else if (link.original_cost !== undefined) {
            setForwardCost(link.original_cost);
        }

        if (link.original_reverse_cost !== undefined) {
            setReverseCost(link.original_reverse_cost);
        } else if (link.original_forward_cost !== undefined) {
            setReverseCost(link.original_forward_cost);
        } else if (link.original_cost !== undefined) {
            setReverseCost(link.original_cost);
        }

        setStatus(link.original_status || 'up');
    };

    const isDirty = (link.forward_cost !== undefined ? link.forward_cost : (link.cost || 0)) !== forwardCost ||
        (link.reverse_cost !== undefined ? link.reverse_cost : (link.forward_cost || link.cost || 0)) !== reverseCost ||
        link.status !== status;

    return (
        <div className="absolute bottom-4 right-4 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-purple-200 dark:border-purple-500/50 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 z-30">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
                <h3 className="font-bold text-purple-600 dark:text-purple-300 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Edit Link (Simulation)
                </h3>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700/50">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{getHostname(link.source)}</span>
                        <span className="text-purple-500 font-bold">↔</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{getHostname(link.target)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-700">
                        <span className="flex items-center gap-1"><Network className="w-3 h-3" /> {link.source_interface}</span>
                        <span className="flex items-center gap-1">{link.target_interface} <Network className="w-3 h-3" /></span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">OSPF Cost (Forward)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={forwardCost}
                            onChange={(e) => setForwardCost(Math.min(65535, Math.max(1, parseInt(e.target.value) || 0)))}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-purple-500 outline-none font-mono"
                        />
                        <div className="text-xs text-gray-500 w-12 text-right">
                            {forwardCost < 100 ? 'Fast' : forwardCost > 1000 ? 'Slow' : 'Avg'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">OSPF Cost (Reverse)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={reverseCost}
                            onChange={(e) => setReverseCost(Math.min(65535, Math.max(1, parseInt(e.target.value) || 0)))}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-purple-500 outline-none font-mono"
                        />
                        <div className="text-xs text-gray-500 w-12 text-right">
                            {reverseCost < 100 ? 'Fast' : reverseCost > 1000 ? 'Slow' : 'Avg'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Link Status</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatus('up')}
                            className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${status === 'up' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            UP
                        </button>
                        <button
                            onClick={() => setStatus('down')}
                            className={`flex-1 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 ${status === 'down' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Power className="w-3 h-3" />
                            DOWN
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleReset}
                        disabled={!link.is_modified && !isDirty}
                        className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50 transition-colors"
                        title="Reset to Original"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkEditPanel;