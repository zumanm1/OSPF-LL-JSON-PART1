import React, { useState, useMemo, useEffect } from 'react';
import { NetworkData, NetworkNode, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { ArrowRight, MapPin, Play, TableProperties, Route, SlidersHorizontal, Loader2 } from 'lucide-react';

interface AnalysisSidebarProps {
  data: NetworkData;
  onPathsFound: (paths: PathResult[]) => void;
  onSelectPath: (path: PathResult | null) => void;
  onShowMatrix: (sourceCountry: string, destCountry: string) => void;
  preselectedSource?: { id: string, country: string } | null;
  preselectedDest?: { id: string, country: string } | null;
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({ 
  data, 
  onPathsFound, 
  onSelectPath,
  onShowMatrix,
  preselectedSource,
  preselectedDest
}) => {
  const [sourceCountry, setSourceCountry] = useState<string>('');
  const [destCountry, setDestCountry] = useState<string>('');
  const [sourceNode, setSourceNode] = useState<string>('');
  const [destNode, setDestNode] = useState<string>('');
  const [limit, setLimit] = useState<number>(20);
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize from props if available
  useEffect(() => {
    if (preselectedSource) {
        setSourceCountry(preselectedSource.country);
        setSourceNode(preselectedSource.id);
    }
  }, [preselectedSource]);

  useEffect(() => {
    if (preselectedDest) {
        setDestCountry(preselectedDest.country);
        setDestNode(preselectedDest.id);
    }
  }, [preselectedDest]);

  // Extract unique countries
  const countries = useMemo(() => {
    const s = new Set(data.nodes.map(n => n.country));
    return Array.from(s).sort();
  }, [data]);

  // Filter nodes based on selected country
  const sourceNodes = useMemo(() => 
    data.nodes.filter(n => !sourceCountry || n.country === sourceCountry).sort((a,b) => a.hostname.localeCompare(b.hostname)), 
  [data, sourceCountry]);

  const destNodes = useMemo(() => 
    data.nodes.filter(n => !destCountry || n.country === destCountry).sort((a,b) => a.hostname.localeCompare(b.hostname)), 
  [data, destCountry]);

  const handleFindPaths = async () => {
    setIsCalculating(true);
    setPaths([]);
    onSelectPath(null);
    
    // Use setTimeout to allow UI calculate state to render
    setTimeout(() => {
        let results: PathResult[] = [];

        if (sourceNode && destNode) {
            // Specific Node to Node
            results = findAllPaths(data.nodes, data.links, sourceNode, destNode, limit);
        } 
        else if (sourceCountry && destCountry) {
            // Country to Country (find best paths between all nodes)
            const sNodes = data.nodes.filter(n => n.country === sourceCountry);
            const dNodes = data.nodes.filter(n => n.country === destCountry);
            
            let allPaths: PathResult[] = [];
            
            // Iterate all pairs
            // Optimization: limit per pair to a small number to avoid explosion, then sort global
            const limitPerPair = 3; 

            sNodes.forEach(s => {
                dNodes.forEach(d => {
                    if (s.id !== d.id) {
                        const pairPaths = findAllPaths(data.nodes, data.links, s.id, d.id, limitPerPair);
                        allPaths.push(...pairPaths);
                    }
                });
            });

            results = allPaths.sort((a,b) => a.totalCost - b.totalCost).slice(0, limit);
        }

        setPaths(results);
        onPathsFound(results);
        
        if (results.length > 0) {
           handlePathClick(results[0]); // Auto-select best path
        }
        setIsCalculating(false);
    }, 100);
  };

  const handlePathClick = (path: PathResult) => {
    setSelectedPathId(path.id);
    onSelectPath(path);
  };

  const canCalculate = (sourceNode && destNode) || (sourceCountry && destCountry && !sourceNode && !destNode);

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Path Analysis</h3>
             <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3 h-3 text-gray-500" />
                <select 
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-gray-800 text-xs text-gray-400 border border-gray-700 rounded px-1 outline-none focus:border-blue-500"
                >
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                    <option value={100}>Top 100</option>
                </select>
             </div>
        </div>
        
        {/* Source Selection */}
        <div className={`space-y-2 p-3 rounded-lg border transition-colors ${sourceNode ? 'bg-blue-900/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Source</span>
          </div>
          <select 
            className="w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded p-2 focus:border-blue-500 outline-none"
            value={sourceCountry}
            onChange={(e) => { setSourceCountry(e.target.value); setSourceNode(''); }}
          >
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded p-2 focus:border-blue-500 outline-none disabled:opacity-50"
            value={sourceNode}
            onChange={(e) => setSourceNode(e.target.value)}
            disabled={!sourceCountry}
          >
            <option value="">Any Node (All {sourceCountry})</option>
            {sourceNodes.map(n => (
              <option key={n.id} value={n.id}>{n.hostname}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center -my-2 z-10 relative">
             <div className="bg-gray-700 rounded-full p-1 border border-gray-600">
                <ArrowRight className="w-4 h-4 text-gray-400" />
             </div>
        </div>

        {/* Destination Selection */}
        <div className={`space-y-2 p-3 rounded-lg border transition-colors ${destNode ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Destination</span>
          </div>
           <select 
            className="w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded p-2 focus:border-emerald-500 outline-none"
            value={destCountry}
            onChange={(e) => { setDestCountry(e.target.value); setDestNode(''); }}
          >
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded p-2 focus:border-emerald-500 outline-none disabled:opacity-50"
            value={destNode}
            onChange={(e) => setDestNode(e.target.value)}
            disabled={!destCountry}
          >
             <option value="">Any Node (All {destCountry})</option>
            {destNodes.map(n => (
              <option key={n.id} value={n.id}>{n.hostname}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
             <button 
                onClick={handleFindPaths}
                disabled={!canCalculate || isCalculating}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white p-2 rounded-lg transition-colors text-xs font-medium shadow-lg shadow-blue-900/20"
             >
                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
                {sourceNode && destNode ? 'Find Path' : 'Find All'}
             </button>
             <button 
                onClick={() => onShowMatrix(sourceCountry, destCountry)}
                disabled={!sourceCountry || !destCountry}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors text-xs font-medium border border-gray-600"
             >
                <TableProperties className="w-4 h-4" />
                Matrix
             </button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-900/30 rounded-lg border border-gray-800/50">
        <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50">
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Results 
                {paths.length > 0 && <span className="text-blue-400 ml-1">({paths.length})</span>}
             </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {paths.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs italic gap-2">
                    <Route className="w-6 h-6 opacity-20" />
                    <span>{isCalculating ? 'Calculating routes...' : 'No paths calculated.'}</span>
                </div>
            ) : (
                paths.map((path, idx) => (
                    <div 
                        key={path.id}
                        onClick={() => handlePathClick(path)}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                            selectedPathId === path.id 
                            ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]' 
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                     idx === 0 
                                     ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                     : 'bg-gray-700 text-gray-400 border-gray-600'
                                 }`}>
                                    #{idx + 1}
                                 </span>
                                 <span className="text-[10px] font-medium text-gray-500">{path.hopCount} Hops</span>
                             </div>
                             <span className="text-xs font-mono font-bold text-blue-200 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/20">
                                {path.totalCost}
                             </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 items-center text-[10px] leading-relaxed">
                            {path.nodes.map((nodeId, i) => (
                                <React.Fragment key={i}>
                                    <span className={`font-mono ${
                                        i === 0 ? 'text-blue-400' : 
                                        i === path.nodes.length - 1 ? 'text-emerald-400' : 'text-gray-400'
                                    }`}>
                                        {nodeId}
                                    </span>
                                    {i < path.nodes.length - 1 && (
                                        <ArrowRight className="w-2.5 h-2.5 text-gray-700" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisSidebar;