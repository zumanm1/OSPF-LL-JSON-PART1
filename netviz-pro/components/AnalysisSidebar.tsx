import React, { useState, useMemo, useEffect } from 'react';
import { NetworkData, NetworkNode, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { ArrowRight, ArrowLeftRight, MapPin, Play, TableProperties, Route, SlidersHorizontal, Loader2, RefreshCw, AlertTriangle, ArrowUpDown } from 'lucide-react';

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
  const [reversePaths, setReversePaths] = useState<PathResult[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showBidirectional, setShowBidirectional] = useState(false);
  const [viewMode, setViewMode] = useState<'forward' | 'reverse' | 'both'>('forward');

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
    data.nodes.filter(n => !sourceCountry || n.country === sourceCountry).sort((a, b) => a.hostname.localeCompare(b.hostname)),
    [data, sourceCountry]);

  const destNodes = useMemo(() =>
    data.nodes.filter(n => !destCountry || n.country === destCountry).sort((a, b) => a.hostname.localeCompare(b.hostname)),
    [data, destCountry]);

  const handleFindPaths = async () => {
    setIsCalculating(true);
    setPaths([]);
    setReversePaths([]);
    onSelectPath(null);

    // Use setTimeout to allow UI calculate state to render
    setTimeout(() => {
      let results: PathResult[] = [];
      let reverseResults: PathResult[] = [];

      if (sourceNode && destNode) {
        // Specific Node to Node
        results = findAllPaths(data.nodes, data.links, sourceNode, destNode, limit);
        // Also calculate reverse direction for bidirectional comparison
        if (showBidirectional) {
          reverseResults = findAllPaths(data.nodes, data.links, destNode, sourceNode, limit);
        }
      }
      else if (sourceCountry && destCountry) {
        // Country to Country (find best paths between all nodes)
        const sNodes = data.nodes.filter(n => n.country === sourceCountry);
        const dNodes = data.nodes.filter(n => n.country === destCountry);

        let allPaths: PathResult[] = [];
        let allReversePaths: PathResult[] = [];

        // Iterate all pairs
        // Optimization: limit per pair to a small number to avoid explosion, then sort global
        const limitPerPair = 3;

        sNodes.forEach(s => {
          dNodes.forEach(d => {
            if (s.id !== d.id) {
              const pairPaths = findAllPaths(data.nodes, data.links, s.id, d.id, limitPerPair);
              allPaths.push(...pairPaths);
              // Calculate reverse for bidirectional
              if (showBidirectional) {
                const reversePairPaths = findAllPaths(data.nodes, data.links, d.id, s.id, limitPerPair);
                allReversePaths.push(...reversePairPaths);
              }
            }
          });
        });

        results = allPaths.sort((a, b) => a.totalCost - b.totalCost).slice(0, limit);
        if (showBidirectional) {
          reverseResults = allReversePaths.sort((a, b) => a.totalCost - b.totalCost).slice(0, limit);
        }
      }

      setPaths(results);
      setReversePaths(reverseResults);
      onPathsFound(results);

      if (results.length > 0) {
        handlePathClick(results[0]); // Auto-select best path
      }
      setIsCalculating(false);
    }, 100);
  };

  // Swap source and destination
  const handleSwap = () => {
    const tempCountry = sourceCountry;
    const tempNode = sourceNode;
    setSourceCountry(destCountry);
    setSourceNode(destNode);
    setDestCountry(tempCountry);
    setDestNode(tempNode);
  };

  // Calculate asymmetry statistics
  const asymmetryStats = useMemo(() => {
    if (paths.length === 0 || reversePaths.length === 0) return null;
    const forwardMinCost = Math.min(...paths.map(p => p.totalCost));
    const reverseMinCost = Math.min(...reversePaths.map(p => p.totalCost));
    const difference = Math.abs(forwardMinCost - reverseMinCost);
    const ratio = forwardMinCost > 0 ? reverseMinCost / forwardMinCost : 1;
    const isAsymmetric = difference > 0;
    return {
      forwardMinCost,
      reverseMinCost,
      difference,
      ratio,
      isAsymmetric,
      higherDirection: forwardMinCost > reverseMinCost ? 'forward' : 'reverse'
    };
  }, [paths, reversePaths]);

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
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Path Analysis</h3>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3 h-3 text-gray-500" />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1 outline-none focus:border-blue-500"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
        </div>

        {/* Source Selection */}
        <div className={`space-y-2 p-3 rounded-lg border transition-colors ${sourceNode ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/30' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Source</span>
          </div>
          <select
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded p-2 focus:border-blue-500 outline-none"
            value={sourceCountry}
            onChange={(e) => { setSourceCountry(e.target.value); setSourceNode(''); }}
          >
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded p-2 focus:border-blue-500 outline-none disabled:opacity-50"
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
          <button
            onClick={handleSwap}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5 border border-gray-300 dark:border-gray-600 transition-colors"
            title="Swap source and destination"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Destination Selection */}
        <div className={`space-y-2 p-3 rounded-lg border transition-colors ${destNode ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Destination</span>
          </div>
          <select
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded p-2 focus:border-emerald-500 outline-none"
            value={destCountry}
            onChange={(e) => { setDestCountry(e.target.value); setDestNode(''); }}
          >
            <option value="">Select Country...</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded p-2 focus:border-emerald-500 outline-none disabled:opacity-50"
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

        {/* Bidirectional Toggle */}
        <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Compare Both Directions</span>
          </div>
          <button
            onClick={() => setShowBidirectional(!showBidirectional)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showBidirectional ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              showBidirectional ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
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
            className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-white p-2 rounded-lg transition-colors text-xs font-medium border border-gray-300 dark:border-gray-600"
          >
            <TableProperties className="w-4 h-4" />
            Matrix
          </button>
        </div>
      </div>

      {/* Asymmetry Alert */}
      {showBidirectional && asymmetryStats && asymmetryStats.isAsymmetric && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-600/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Asymmetric Routing Detected</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800/50 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400">Forward (A→B)</span>
              <span className={`font-bold ${asymmetryStats.higherDirection === 'forward' ? 'text-red-500' : 'text-green-500'}`}>
                {asymmetryStats.forwardMinCost}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-gray-800/50 p-2 rounded">
              <span className="text-gray-500 dark:text-gray-400">Reverse (B→A)</span>
              <span className={`font-bold ${asymmetryStats.higherDirection === 'reverse' ? 'text-red-500' : 'text-green-500'}`}>
                {asymmetryStats.reverseMinCost}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Difference: <span className="font-bold">{asymmetryStats.difference}</span> |
            Ratio: <span className="font-bold">{asymmetryStats.ratio.toFixed(2)}x</span>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800/50">
        {/* Direction Tabs for Bidirectional Mode */}
        {showBidirectional && (paths.length > 0 || reversePaths.length > 0) && (
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setViewMode('forward')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'forward'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Forward ({paths.length})
            </button>
            <button
              onClick={() => setViewMode('reverse')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'reverse'
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Reverse ({reversePaths.length})
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'both'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b-2 border-gray-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Both
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Results
            {paths.length > 0 && <span className="text-blue-400 ml-1">({
              viewMode === 'both' ? paths.length + reversePaths.length :
              viewMode === 'reverse' ? reversePaths.length : paths.length
            })</span>}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {paths.length === 0 && reversePaths.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-600 text-xs italic gap-2">
              <Route className="w-6 h-6 opacity-20" />
              <span>{isCalculating ? 'Calculating routes...' : 'No paths calculated.'}</span>
            </div>
          ) : (
            <>
              {/* Forward Paths */}
              {(viewMode === 'forward' || viewMode === 'both') && paths.map((path, idx) => (
                <div
                  key={path.id}
                  onClick={() => handlePathClick(path)}
                  className={`p-3 rounded border cursor-pointer transition-all ${selectedPathId === path.id
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {viewMode === 'both' && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          A→B
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${idx === 0
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                        }`}>
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500">{path.hopCount} Hops</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      {path.totalCost}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 items-center text-[10px] leading-relaxed">
                    {path.nodes.map((nodeId, i) => (
                      <React.Fragment key={i}>
                        <span className={`font-mono ${i === 0 ? 'text-blue-500 dark:text-blue-400' :
                            i === path.nodes.length - 1 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {nodeId}
                        </span>
                        {i < path.nodes.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 text-gray-400 dark:text-gray-700" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}

              {/* Reverse Paths */}
              {(viewMode === 'reverse' || viewMode === 'both') && reversePaths.map((path, idx) => (
                <div
                  key={`rev-${path.id}`}
                  onClick={() => handlePathClick(path)}
                  className={`p-3 rounded border cursor-pointer transition-all ${selectedPathId === path.id
                      ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_-3px_rgba(147,51,234,0.2)]'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {viewMode === 'both' && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          B→A
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${idx === 0
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                        }`}>
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500">{path.hopCount} Hops</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">
                      {path.totalCost}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 items-center text-[10px] leading-relaxed">
                    {path.nodes.map((nodeId, i) => (
                      <React.Fragment key={i}>
                        <span className={`font-mono ${i === 0 ? 'text-purple-500 dark:text-purple-400' :
                            i === path.nodes.length - 1 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {nodeId}
                        </span>
                        {i < path.nodes.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 text-gray-400 dark:text-gray-700" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisSidebar;