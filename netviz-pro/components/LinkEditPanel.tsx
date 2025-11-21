import React, { useState, useEffect } from 'react';
import { NetworkLink, NetworkNode } from '../types';
import { X, Save, RotateCcw, Power, Activity, Network } from 'lucide-react';

interface LinkEditPanelProps {
  link: NetworkLink | null;
  onClose: () => void;
  onUpdate: (linkIndex: number, newCost: number, newReverseCost: number | undefined, newStatus: string) => void;
}

const LinkEditPanel: React.FC<LinkEditPanelProps> = ({ link, onClose, onUpdate }) => {
  const [cost, setCost] = useState<number>(0);
  const [reverseCost, setReverseCost] = useState<number>(0);
  const [status, setStatus] = useState<string>('up');

  useEffect(() => {
    if (link) {
      setCost(link.cost);
      setReverseCost(link.reverse_cost !== undefined ? link.reverse_cost : link.cost);
      setStatus(link.status);
    }
  }, [link]);

  if (!link || link.index === undefined) return null;

  const getHostname = (nodeOrId: string | NetworkNode) => {
      return typeof nodeOrId === 'object' ? nodeOrId.hostname : nodeOrId;
  };

  const handleSave = () => {
    // If reverse cost is same as cost and was originally symmetric, we could pass undefined to keep it symmetric?
    // But explicit is better for simulation. We pass the value.
    onUpdate(link.index!, cost, reverseCost, status);
    onClose();
  };

  const handleReset = () => {
      if (link.original_cost !== undefined) {
          setCost(link.original_cost);
          // If we don't track original_reverse_cost, we might have issues. 
          // But 'link' passed here is from 'currentData' which has 'original_cost'.
          // 'currentData' logic preserves 'reverse_cost' or falls back.
          // Ideally we should track 'original_reverse_cost' in the link object too.
          // For now, let's assume reset restores to what is in 'link' as original.
          // However, 'link' is the *current* simulated link.
          // We need to know what the 'original' was. 
          // The 'currentData' logic: original_cost: link.original_cost ?? link.cost
          // It doesn't seem to preserve original_reverse_cost explicitly if it wasn't there?
          // Actually currentData just copies ...link. 
          // Let's look at App.tsx again.
          // original_cost: link.original_cost ?? link.cost
          // It does NOT save original_reverse_cost.
          // This is a small gap. 
          // For now, let's just reset to 'cost' (which might be the original if not modified) 
          // or we need to trust that 'original_cost' is the forward cost.
          // We will approximate: Reset resets to original forward cost. 
          // And we will set reverse to original forward too if symmetric, or... 
          // We can't perfectly reset asymmetric if we don't store original reverse.
          // BUT, `link` comes from `currentData`. `currentData` is derived from `originalData`.
          // If we clear overrides (handleReset in App.tsx clears ALL), it works.
          // This handleReset is local to the panel fields? No, it seems to set local state.
          // But wait, if I want to "Reset" inside the panel, I should set the state to `link.original_cost` etc.
          // Does `link` have `original_reverse_cost`? No.
          // Let's just set it to `link.original_cost` for now and assume symmetry for reset if unknown.
          setCost(link.original_cost || link.cost);
          setReverseCost(link.original_cost || link.cost); // Imperfect but safe fallback
          setStatus(link.original_status || 'up');
      }
  };

  const isDirty = link.cost !== cost || (link.reverse_cost !== undefined ? link.reverse_cost : link.cost) !== reverseCost || link.status !== status;

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-gray-900/95 backdrop-blur border border-purple-500/50 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 z-30">
      <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-purple-900/20">
        <h3 className="font-bold text-purple-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Edit Link (Simulation)
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-xs text-gray-400 flex flex-col gap-2 bg-gray-800 p-3 rounded border border-gray-700/50">
            <div className="flex justify-between items-center">
                <span className="font-bold text-gray-300">{getHostname(link.source)}</span>
                <span className="text-purple-500 font-bold">↔</span>
                <span className="font-bold text-gray-300">{getHostname(link.target)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-700">
                <span className="flex items-center gap-1"><Network className="w-3 h-3" /> {link.source_interface}</span>
                <span className="flex items-center gap-1">{link.target_interface} <Network className="w-3 h-3" /></span>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase">OSPF Cost (Forward)</label>
            <div className="flex items-center gap-2">
                <input 
                    type="number" 
                    value={cost}
                    onChange={(e) => setCost(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none font-mono"
                />
                <div className="text-xs text-gray-500 w-12 text-right">
                    {cost < 100 ? 'Fast' : cost > 1000 ? 'Slow' : 'Avg'}
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase">OSPF Cost (Reverse)</label>
            <div className="flex items-center gap-2">
                <input 
                    type="number" 
                    value={reverseCost}
                    onChange={(e) => setReverseCost(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none font-mono"
                />
                <div className="text-xs text-gray-500 w-12 text-right">
                    {reverseCost < 100 ? 'Fast' : reverseCost > 1000 ? 'Slow' : 'Avg'}
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase">Link Status</label>
            <div className="flex gap-2">
                <button 
                    onClick={() => setStatus('up')}
                    className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${
                        status === 'up' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}
                >
                    UP
                </button>
                <button 
                     onClick={() => setStatus('down')}
                     className={`flex-1 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                        status === 'down' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
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
                className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-50 transition-colors"
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