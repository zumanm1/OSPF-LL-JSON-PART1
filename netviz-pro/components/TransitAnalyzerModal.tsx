import React, { useState, useMemo } from 'react';
import { NetworkData, NetworkNode, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Globe, ArrowRight, AlertTriangle, TrendingUp, Network, Layers, Filter, Route, Medal, ChevronRight, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface TransitAnalyzerModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface TransitCountryData {
  country: string;
  transitPathCount: number;
  totalPathsAnalyzed: number;
  percentage: number;
  criticalityScore: number;
  servedPairs: { source: string; dest: string; pathCount: number; percentage: number }[];
  transitNodes: { id: string; hostname: string; pathsThrough: number }[];
  alternativeAvailable: boolean;
}

interface PathWithTransit extends PathResult {
  sourceCountry: string;
  destCountry: string;
  transitCountries: string[];
}

interface RankedRoute {
  rank: number;
  rankLabel: string;
  path: string[];
  cost: number;
  hopCount: number;
  sourceCountry: string;
  destCountry: string;
  transitCountries: string[];
  isPreferred: boolean;
}

// Helper to get rank label
const getRankLabel = (rank: number): string => {
  if (rank === 1) return 'Primary';
  if (rank === 2) return 'Secondary';
  if (rank === 3) return 'Tertiary';
  return `${rank}th`;
};

const TransitAnalyzerModal: React.FC<TransitAnalyzerModalProps> = ({ data, onClose }) => {
  const [selectedTransit, setSelectedTransit] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterDest, setFilterDest] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<{source: string; dest: string} | null>(null);
  const [showDetailedRoutes, setShowDetailedRoutes] = useState(false);

  // Get all countries
  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  // Analyze all paths and identify transit countries
  const transitAnalysis = useMemo(() => {
    const allPathsWithTransit: PathWithTransit[] = [];
    const transitMap = new Map<string, {
      pathCount: number;
      pairs: Map<string, number>;
      nodes: Map<string, number>;
    }>();

    // Initialize transit map
    countries.forEach(c => {
      transitMap.set(c, { pathCount: 0, pairs: new Map(), nodes: new Map() });
    });

    // CRITICAL PERFORMANCE FIX: Pre-compute node maps to avoid repeated filtering
    const nodesByCountry = new Map<string, NetworkNode[]>();
    countries.forEach(country => {
      nodesByCountry.set(country, data.nodes.filter(n => n.country === country));
    });

    // CRITICAL PERFORMANCE FIX: Use optimized O(n²) algorithm instead of O(n⁴)
    const countryPairs: Array<[string, string]> = [];
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        const sourceCountry = countries[i];
        const destCountry = countries[j];
        
        // Apply filters early to avoid unnecessary computation
        if (filterSource && sourceCountry !== filterSource) continue;
        if (filterDest && destCountry !== filterDest) continue;
        
        countryPairs.push([sourceCountry, destCountry]);
        countryPairs.push([destCountry, sourceCountry]); // Add reverse direction
      }
    }

    // Process each country pair with optimized path finding
    countryPairs.forEach(([sourceCountry, destCountry]) => {
      const sourceNodes = nodesByCountry.get(sourceCountry) || [];
      const destNodes = nodesByCountry.get(destCountry) || [];

      // CRITICAL FIX: Limit path calculations to prevent browser crashes
      // Use representative nodes instead of all possible combinations
      const maxNodesPerCountry = Math.min(sourceNodes.length, 3);
      const maxDestNodes = Math.min(destNodes.length, 3);
      
      const selectedSourceNodes = sourceNodes.slice(0, maxNodesPerCountry);
      const selectedDestNodes = destNodes.slice(0, maxDestNodes);

      selectedSourceNodes.forEach(sNode => {
        selectedDestNodes.forEach(dNode => {
          // CRITICAL FIX: Limit path count and add early termination for performance
          const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 3); // Reduced from 5

          paths.forEach(path => {
            const transitCountries: string[] = [];

            // Find transit countries (not source, not dest)
            for (let i = 1; i < path.nodes.length - 1; i++) {
              const node = data.nodes.find(n => n.id === path.nodes[i]);
              if (node && node.country !== sourceCountry && node.country !== destCountry) {
                if (!transitCountries.includes(node.country)) {
                  transitCountries.push(node.country);
                }

                // Update transit map
                const transit = transitMap.get(node.country)!;
                transit.pathCount++;

                const pairKey = `${sourceCountry}->${destCountry}`;
                transit.pairs.set(pairKey, (transit.pairs.get(pairKey) || 0) + 1);
                transit.nodes.set(node.id, (transit.nodes.get(node.id) || 0) + 1);
              }
            }

            allPathsWithTransit.push({
              ...path,
              sourceCountry,
              destCountry,
              transitCountries
            });
          });
        });
      });
    });

    // Calculate transit country data
    const transitData: TransitCountryData[] = [];
    const totalPaths = allPathsWithTransit.length;

    transitMap.forEach((transit, country) => {
      if (transit.pathCount === 0) return;

      // Calculate criticality score
      const pathPercentage = (transit.pathCount / totalPaths) * 100;
      const pairCoverage = (transit.pairs.size / (countries.length * (countries.length - 1))) * 100;
      const nodeDiversity = (transit.nodes.size / data.nodes.filter(n => n.country === country).length) * 100;
      const criticalityScore = Math.min(100, Math.round(pathPercentage * 0.5 + pairCoverage * 0.3 + nodeDiversity * 0.2));

      // Check if alternatives exist (paths without this transit)
      const pathsWithoutTransit = allPathsWithTransit.filter(p => !p.transitCountries.includes(country));
      const alternativeAvailable = pathsWithoutTransit.length > 0;

      transitData.push({
        country,
        transitPathCount: transit.pathCount,
        totalPathsAnalyzed: totalPaths,
        percentage: pathPercentage,
        criticalityScore,
        servedPairs: Array.from(transit.pairs.entries())
          .map(([pair, count]) => {
            const [source, dest] = pair.split('->');
            const totalForPair = allPathsWithTransit.filter(
              p => p.sourceCountry === source && p.destCountry === dest
            ).length;
            return {
              source,
              dest,
              pathCount: count,
              percentage: totalForPair > 0 ? (count / totalForPair) * 100 : 0
            };
          })
          .sort((a, b) => b.pathCount - a.pathCount),
        transitNodes: Array.from(transit.nodes.entries())
          .map(([nodeId, count]) => {
            const node = data.nodes.find(n => n.id === nodeId);
            return {
              id: nodeId,
              hostname: node?.hostname || nodeId,
              pathsThrough: count
            };
          })
          .sort((a, b) => b.pathsThrough - a.pathsThrough),
        alternativeAvailable
      });
    });

    return {
      transitData: transitData.sort((a, b) => b.criticalityScore - a.criticalityScore),
      totalPaths,
      allPaths: allPathsWithTransit
    };
  }, [data, countries, filterSource, filterDest]);

  const selectedData = selectedTransit
    ? transitAnalysis.transitData.find(t => t.country === selectedTransit)
    : null;

  // Compute ranked routes for the selected transit country
  const rankedRoutes = useMemo(() => {
    if (!selectedTransit || !selectedData) return [];

    // Get all paths that go through this transit country
    const pathsThroughTransit = transitAnalysis.allPaths.filter(
      p => p.transitCountries.includes(selectedTransit)
    );

    // Group by source-dest pair and rank by cost
    const pairGroups = new Map<string, PathWithTransit[]>();
    pathsThroughTransit.forEach(path => {
      const key = `${path.sourceCountry}->${path.destCountry}`;
      if (!pairGroups.has(key)) {
        pairGroups.set(key, []);
      }
      pairGroups.get(key)!.push(path);
    });

    // Create ranked routes
    const routes: RankedRoute[] = [];
    pairGroups.forEach((paths, pairKey) => {
      // Sort paths by cost (lowest first)
      const sortedPaths = paths.sort((a, b) => a.totalCost - b.totalCost);
      const minCost = sortedPaths[0].totalCost;

      sortedPaths.forEach((path, index) => {
        routes.push({
          rank: index + 1,
          rankLabel: getRankLabel(index + 1),
          path: path.nodes,
          cost: path.totalCost,
          hopCount: path.hopCount,
          sourceCountry: path.sourceCountry,
          destCountry: path.destCountry,
          transitCountries: path.transitCountries,
          isPreferred: path.totalCost === minCost
        });
      });
    });

    // Sort by pair then by rank
    return routes.sort((a, b) => {
      const pairCompare = `${a.sourceCountry}->${a.destCountry}`.localeCompare(`${b.sourceCountry}->${b.destCountry}`);
      if (pairCompare !== 0) return pairCompare;
      return a.rank - b.rank;
    });
  }, [selectedTransit, selectedData, transitAnalysis.allPaths]);

  // Get unique pairs for the filter dropdown
  const uniquePairs = useMemo(() => {
    if (!selectedData) return [];
    return selectedData.servedPairs.map(p => ({ source: p.source, dest: p.dest }));
  }, [selectedData]);

  // Filter routes by selected pair
  const filteredRoutes = useMemo(() => {
    if (!selectedPair) return rankedRoutes;
    return rankedRoutes.filter(
      r => r.sourceCountry === selectedPair.source && r.destCountry === selectedPair.dest
    );
  }, [rankedRoutes, selectedPair]);

  const handleExport = () => {
    const exportData = transitAnalysis.transitData.map(transit => ({
      country: transit.country,
      transitPercent: transit.percentage.toFixed(1),
      pathCount: transit.transitPathCount,
      pairsServed: transit.servedPairs.length,
      criticalityScore: transit.criticalityScore,
      hasAlternatives: transit.alternativeAvailable ? 'Yes' : 'No',
      transitNodes: transit.transitNodes.map(n => n.id).join('; '),
    }));

    const columns: ExportColumn[] = [
      { header: 'Transit Country', key: 'country' },
      { header: 'Transit %', key: 'transitPercent' },
      { header: 'Paths Through', key: 'pathCount' },
      { header: 'Pairs Served', key: 'pairsServed' },
      { header: 'Criticality Score', key: 'criticalityScore' },
      { header: 'Has Alternatives', key: 'hasAlternatives' },
      { header: 'Transit Nodes', key: 'transitNodes' },
    ];

    exportToCSV(exportData, columns, 'transit_analysis');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-400" />
              Transit Country Analyzer
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Identify which countries serve as transit hubs for traffic between other countries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter:</span>
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Sources</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <select
            value={filterDest}
            onChange={(e) => setFilterDest(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Destinations</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-4">
            {transitAnalysis.totalPaths} paths analyzed
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Transit Countries List */}
          <div className="w-1/3 border-r border-gray-800 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Transit Countries</h3>

            {transitAnalysis.transitData.length === 0 ? (
              <p className="text-sm text-gray-500">No transit countries found (direct paths only)</p>
            ) : (
              <div className="space-y-2">
                {transitAnalysis.transitData.map(transit => (
                  <button
                    key={transit.country}
                    onClick={() => setSelectedTransit(transit.country)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedTransit === transit.country
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[transit.country] || '#6b7280' }}
                        />
                        <span className="font-medium text-white">{transit.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!transit.alternativeAvailable && (
                          <AlertTriangle className="w-4 h-4 text-red-400" title="No alternatives" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          transit.criticalityScore >= 70 ? 'bg-red-500/20 text-red-300' :
                          transit.criticalityScore >= 40 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {transit.criticalityScore}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {transit.transitPathCount} paths • {transit.servedPairs.length} pairs served
                    </div>
                    <div className="mt-1 w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          transit.criticalityScore >= 70 ? 'bg-red-500' :
                          transit.criticalityScore >= 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${transit.criticalityScore}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedData ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: COUNTRY_COLORS[selectedData.country] || '#6b7280' }}
                    >
                      {selectedData.country.substring(0, 2)}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedData.country}</h3>
                      <p className="text-sm text-gray-400">Transit Hub Analysis</p>
                    </div>
                  </div>
                  {!selectedData.alternativeAvailable && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-300">Critical Transit - No Alternatives</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Layers className="w-4 h-4" />
                      Paths Through
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedData.transitPathCount}</p>
                    <p className="text-xs text-gray-500">{selectedData.percentage.toFixed(1)}% of total</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Network className="w-4 h-4" />
                      Pairs Served
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedData.servedPairs.length}</p>
                    <p className="text-xs text-gray-500">country pairs</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Globe className="w-4 h-4" />
                      Transit Nodes
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedData.transitNodes.length}</p>
                    <p className="text-xs text-gray-500">routers used</p>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <TrendingUp className="w-4 h-4" />
                      Criticality
                    </div>
                    <p className={`text-2xl font-bold ${
                      selectedData.criticalityScore >= 70 ? 'text-red-400' :
                      selectedData.criticalityScore >= 40 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {selectedData.criticalityScore}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedData.criticalityScore >= 70 ? 'High Risk' :
                       selectedData.criticalityScore >= 40 ? 'Medium Risk' : 'Low Risk'}
                    </p>
                  </div>
                </div>

                {/* Country Pairs Served */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Country Pairs Using This Transit</h4>
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400 font-medium">Source</th>
                          <th className="text-center p-3 text-gray-400 font-medium"></th>
                          <th className="text-left p-3 text-gray-400 font-medium">Destination</th>
                          <th className="text-right p-3 text-gray-400 font-medium">Paths</th>
                          <th className="text-right p-3 text-gray-400 font-medium">% of Pair</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedData.servedPairs.slice(0, 10).map((pair, idx) => (
                          <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COUNTRY_COLORS[pair.source] || '#6b7280' }}
                                />
                                <span className="text-white">{pair.source}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <ArrowRight className="w-4 h-4 text-gray-500 inline" />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COUNTRY_COLORS[pair.dest] || '#6b7280' }}
                                />
                                <span className="text-white">{pair.dest}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-white">{pair.pathCount}</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                pair.percentage >= 80 ? 'bg-red-500/20 text-red-300' :
                                pair.percentage >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {pair.percentage.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transit Nodes */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Transit Nodes in {selectedData.country}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedData.transitNodes.map(node => (
                      <div
                        key={node.id}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">{node.id}</p>
                          <p className="text-xs text-gray-400">{node.hostname}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{node.pathsThrough}</p>
                          <p className="text-xs text-gray-400">paths</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Routes Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
                      <Route className="w-4 h-4" />
                      Detailed Routes with Cost Rankings
                    </h4>
                    <button
                      onClick={() => setShowDetailedRoutes(!showDetailedRoutes)}
                      className="text-xs px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                    >
                      {showDetailedRoutes ? 'Hide Routes' : `Show ${rankedRoutes.length} Routes`}
                    </button>
                  </div>

                  {showDetailedRoutes && (
                    <>
                      {/* Pair Filter */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs text-gray-400">Filter by pair:</span>
                        <select
                          value={selectedPair ? `${selectedPair.source}->${selectedPair.dest}` : ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              setSelectedPair(null);
                            } else {
                              const [src, dst] = e.target.value.split('->');
                              setSelectedPair({ source: src, dest: dst });
                            }
                          }}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="">All Pairs ({rankedRoutes.length} routes)</option>
                          {uniquePairs.map((pair, idx) => (
                            <option key={idx} value={`${pair.source}->${pair.dest}`}>
                              {pair.source} → {pair.dest}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Routes List */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredRoutes.slice(0, 20).map((route, idx) => (
                          <div
                            key={idx}
                            className={`rounded-lg border p-3 ${
                              route.isPreferred
                                ? 'bg-green-900/20 border-green-700/50'
                                : 'bg-gray-800/30 border-gray-700/50'
                            }`}
                          >
                            {/* Route Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  route.rank === 1
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : route.rank === 2
                                    ? 'bg-gray-400/20 text-gray-300'
                                    : route.rank === 3
                                    ? 'bg-orange-600/20 text-orange-300'
                                    : 'bg-gray-700 text-gray-400'
                                }`}>
                                  {route.rank === 1 && <Medal className="w-3 h-3" />}
                                  {route.rankLabel}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {route.sourceCountry} → {route.destCountry}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${
                                  route.isPreferred ? 'text-green-400' : 'text-gray-300'
                                }`}>
                                  Cost: {route.cost}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {route.hopCount} hops
                                </span>
                              </div>
                            </div>

                            {/* Route Path */}
                            <div className="flex flex-wrap items-center gap-1">
                              {route.path.map((nodeId, nodeIdx) => {
                                const node = data.nodes.find(n => n.id === nodeId);
                                const isTransit = node && route.transitCountries.includes(node.country);
                                return (
                                  <React.Fragment key={nodeId}>
                                    <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                                      isTransit
                                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                        : 'bg-gray-700/50 text-gray-300'
                                    }`}>
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: COUNTRY_COLORS[node?.country || ''] || '#6b7280' }}
                                      />
                                      {nodeId}
                                    </span>
                                    {nodeIdx < route.path.length - 1 && (
                                      <ChevronRight className="w-3 h-3 text-gray-600" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            {/* Cost Badge for non-preferred routes */}
                            {!route.isPreferred && (
                              <div className="mt-2 text-xs text-gray-500">
                                +{route.cost - filteredRoutes.find(r => r.sourceCountry === route.sourceCountry && r.destCountry === route.destCountry && r.rank === 1)?.cost || 0} cost vs Primary
                              </div>
                            )}
                          </div>
                        ))}

                        {filteredRoutes.length > 20 && (
                          <div className="text-center text-xs text-gray-500 py-2">
                            +{filteredRoutes.length - 20} more routes
                          </div>
                        )}

                        {filteredRoutes.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No routes found for this selection
                          </div>
                        )}
                      </div>

                      {/* Route Statistics */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-400">Total Routes</p>
                          <p className="text-lg font-bold text-white">{filteredRoutes.length}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-400">Min Cost</p>
                          <p className="text-lg font-bold text-green-400">
                            {filteredRoutes.length > 0 ? Math.min(...filteredRoutes.map(r => r.cost)) : '-'}
                          </p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-400">Max Cost</p>
                          <p className="text-lg font-bold text-red-400">
                            {filteredRoutes.length > 0 ? Math.max(...filteredRoutes.map(r => r.cost)) : '-'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a transit country to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitAnalyzerModal;
