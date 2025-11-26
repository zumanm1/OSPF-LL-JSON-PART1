import React, { useState, useMemo } from 'react';
import { NetworkData, PathResult, NetworkLink } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Waves, ArrowRight, Layers, AlertTriangle, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface RippleEffectModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface RippleAnalysis {
  modifiedLinkIndex: number;
  newCost: number;
  originalCost: number;
  level1Impact: {
    nodes: string[];
    directCostChange: number;
  };
  level2Impact: {
    nodes: string[];
    pathsRerouted: number;
    newTransitCountries: string[];
    removedTransitCountries: string[];
  };
  level3Impact: {
    totalPathsAffected: number;
    countryPairsAffected: number;
    avgNetworkCostChange: number;
    cascadeRisk: { linkIndex: number; sourceId: string; targetId: string; newLoad: number }[];
  };
  beforeAfterComparison: {
    sourceCountry: string;
    destCountry: string;
    beforeCost: number;
    afterCost: number;
    beforePath: string[];
    afterPath: string[];
    changed: boolean;
  }[];
}

const RippleEffectModal: React.FC<RippleEffectModalProps> = ({ data, onClose }) => {
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);
  const [costChange, setCostChange] = useState<number>(0);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  // Analyze ripple effect
  const rippleAnalysis = useMemo((): RippleAnalysis | null => {
    if (selectedLinkIndex === null) return null;

    const originalLink = data.links[selectedLinkIndex];
    const originalCost = originalLink.forward_cost ?? originalLink.cost;
    const newCost = originalCost + costChange;

    // Create modified links
    const modifiedLinks: NetworkLink[] = data.links.map((link, idx) => {
      if (idx === selectedLinkIndex) {
        return {
          ...link,
          forward_cost: newCost,
          reverse_cost: (link.reverse_cost ?? originalCost) + costChange,
          cost: newCost
        };
      }
      return link;
    });

    const srcId = typeof originalLink.source === 'object' ? originalLink.source.id : originalLink.source;
    const tgtId = typeof originalLink.target === 'object' ? originalLink.target.id : originalLink.target;

    // Level 1: Direct impact (connected nodes)
    const level1Nodes = [srcId, tgtId];
    const directCostChange = costChange;

    // Analyze all paths before and after
    const beforePaths: Map<string, PathResult[]> = new Map();
    const afterPaths: Map<string, PathResult[]> = new Map();
    const beforeAfterComparison: RippleAnalysis['beforeAfterComparison'] = [];

    let totalPathsAffected = 0;
    let totalCostChange = 0;
    let costChangeCount = 0;
    const affectedPairs = new Set<string>();
    const beforeTransit = new Set<string>();
    const afterTransit = new Set<string>();
    const linkUsageBefore: Map<number, number> = new Map();
    const linkUsageAfter: Map<number, number> = new Map();

    countries.forEach(srcCountry => {
      const sourceNodes = data.nodes.filter(n => n.country === srcCountry);

      countries.forEach(destCountry => {
        if (srcCountry === destCountry) return;

        const destNodes = data.nodes.filter(n => n.country === destCountry);
        const pairKey = `${srcCountry}->${destCountry}`;
        const pairPathsBefore: PathResult[] = [];
        const pairPathsAfter: PathResult[] = [];

        sourceNodes.forEach(sNode => {
          destNodes.forEach(dNode => {
            // Before paths (using Dijkstra with original costs)
            const pathsBefore = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 3);
            pairPathsBefore.push(...pathsBefore);

            // Track link usage before
            pathsBefore.forEach(path => {
              for (let i = 0; i < path.nodes.length - 1; i++) {
                const linkIdx = data.links.findIndex(l => {
                  const s = typeof l.source === 'object' ? l.source.id : l.source;
                  const t = typeof l.target === 'object' ? l.target.id : l.target;
                  return (s === path.nodes[i] && t === path.nodes[i + 1]) ||
                         (s === path.nodes[i + 1] && t === path.nodes[i]);
                });
                if (linkIdx !== -1) {
                  linkUsageBefore.set(linkIdx, (linkUsageBefore.get(linkIdx) || 0) + 1);
                }
              }

              // Track transit countries
              path.nodes.slice(1, -1).forEach(nodeId => {
                const node = data.nodes.find(n => n.id === nodeId);
                if (node && node.country !== srcCountry && node.country !== destCountry) {
                  beforeTransit.add(node.country);
                }
              });
            });

            // After paths (using Dijkstra with modified costs)
            const pathsAfter = findAllPaths(data.nodes, modifiedLinks, sNode.id, dNode.id, 3);
            pairPathsAfter.push(...pathsAfter);

            // Track link usage after
            pathsAfter.forEach(path => {
              for (let i = 0; i < path.nodes.length - 1; i++) {
                const linkIdx = data.links.findIndex(l => {
                  const s = typeof l.source === 'object' ? l.source.id : l.source;
                  const t = typeof l.target === 'object' ? l.target.id : l.target;
                  return (s === path.nodes[i] && t === path.nodes[i + 1]) ||
                         (s === path.nodes[i + 1] && t === path.nodes[i]);
                });
                if (linkIdx !== -1) {
                  linkUsageAfter.set(linkIdx, (linkUsageAfter.get(linkIdx) || 0) + 1);
                }
              }

              // Track transit countries
              path.nodes.slice(1, -1).forEach(nodeId => {
                const node = data.nodes.find(n => n.id === nodeId);
                if (node && node.country !== srcCountry && node.country !== destCountry) {
                  afterTransit.add(node.country);
                }
              });
            });
          });
        });

        beforePaths.set(pairKey, pairPathsBefore);
        afterPaths.set(pairKey, pairPathsAfter);

        // Compare best paths
        const bestBefore = pairPathsBefore[0];
        const bestAfter = pairPathsAfter[0];

        if (bestBefore || bestAfter) {
          const beforeCost = bestBefore?.totalCost ?? Infinity;
          const afterCost = bestAfter?.totalCost ?? Infinity;
          const changed = !bestBefore || !bestAfter ||
            bestBefore.nodes.join(',') !== bestAfter.nodes.join(',') ||
            beforeCost !== afterCost;

          if (changed) {
            totalPathsAffected++;
            affectedPairs.add(pairKey);
            if (beforeCost !== Infinity && afterCost !== Infinity) {
              totalCostChange += afterCost - beforeCost;
              costChangeCount++;
            }
          }

          beforeAfterComparison.push({
            sourceCountry: srcCountry,
            destCountry: destCountry,
            beforeCost: beforeCost === Infinity ? -1 : beforeCost,
            afterCost: afterCost === Infinity ? -1 : afterCost,
            beforePath: bestBefore?.nodes || [],
            afterPath: bestAfter?.nodes || [],
            changed
          });
        }
      });
    });

    // Level 2: Indirect impact
    const level2Nodes = new Set<string>();
    beforeAfterComparison.forEach(comp => {
      if (comp.changed) {
        [...comp.beforePath, ...comp.afterPath].forEach(nodeId => {
          if (!level1Nodes.includes(nodeId)) {
            level2Nodes.add(nodeId);
          }
        });
      }
    });

    const pathsRerouted = beforeAfterComparison.filter(c => c.changed && c.beforePath.join(',') !== c.afterPath.join(',')).length;
    const newTransit = Array.from(afterTransit).filter(t => !beforeTransit.has(t));
    const removedTransit = Array.from(beforeTransit).filter(t => !afterTransit.has(t));

    // Level 3: Cascade risk (links that will receive more traffic)
    const cascadeRisk: RippleAnalysis['level3Impact']['cascadeRisk'] = [];
    linkUsageAfter.forEach((afterCount, linkIdx) => {
      const beforeCount = linkUsageBefore.get(linkIdx) || 0;
      if (afterCount > beforeCount && linkIdx !== selectedLinkIndex) {
        const link = data.links[linkIdx];
        const s = typeof link.source === 'object' ? link.source.id : link.source;
        const t = typeof link.target === 'object' ? link.target.id : link.target;
        cascadeRisk.push({
          linkIndex: linkIdx,
          sourceId: s,
          targetId: t,
          newLoad: afterCount - beforeCount
        });
      }
    });

    cascadeRisk.sort((a, b) => b.newLoad - a.newLoad);

    return {
      modifiedLinkIndex: selectedLinkIndex,
      newCost,
      originalCost,
      level1Impact: {
        nodes: level1Nodes,
        directCostChange
      },
      level2Impact: {
        nodes: Array.from(level2Nodes),
        pathsRerouted,
        newTransitCountries: newTransit,
        removedTransitCountries: removedTransit
      },
      level3Impact: {
        totalPathsAffected,
        countryPairsAffected: affectedPairs.size,
        avgNetworkCostChange: costChangeCount > 0 ? totalCostChange / costChangeCount : 0,
        cascadeRisk: cascadeRisk.slice(0, 5)
      },
      beforeAfterComparison: beforeAfterComparison.filter(c => c.changed).sort((a, b) => {
        const deltaA = a.afterCost - a.beforeCost;
        const deltaB = b.afterCost - b.beforeCost;
        return Math.abs(deltaB) - Math.abs(deltaA);
      })
    };
  }, [data, selectedLinkIndex, costChange, countries]);

  const handleExport = () => {
    if (!rippleAnalysis) return;

    const exportData = rippleAnalysis.affectedPairs.map(pair => ({
      sourceCountry: pair.sourceCountry,
      destCountry: pair.destCountry,
      originalCost: pair.originalCost,
      newCost: pair.newCost,
      costChange: pair.costChange,
      pathsAffected: pair.pathsAffected,
    }));

    const columns: ExportColumn[] = [
      { header: 'Source Country', key: 'sourceCountry' },
      { header: 'Dest Country', key: 'destCountry' },
      { header: 'Original Cost', key: 'originalCost' },
      { header: 'New Cost', key: 'newCost' },
      { header: 'Cost Change', key: 'costChange' },
      { header: 'Paths Affected', key: 'pathsAffected' },
    ];

    exportToCSV(exportData, columns, 'ripple_effect_analysis');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Waves className="w-6 h-6 text-indigo-400" />
              Ripple Effect Analyzer
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Analyze downstream impact of link cost changes on the network
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rippleAnalysis && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Link Selector */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Select Link:</span>
            <select
              value={selectedLinkIndex ?? ''}
              onChange={(e) => setSelectedLinkIndex(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white min-w-64"
            >
              <option value="">Choose a link to analyze...</option>
              {data.links.map((link, idx) => {
                const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                return (
                  <option key={idx} value={idx}>
                    {srcId} ↔ {tgtId} (Cost: {link.forward_cost ?? link.cost})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedLinkIndex !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Cost Change:</span>
              <input
                type="number"
                value={costChange}
                onChange={(e) => setCostChange(parseInt(e.target.value) || 0)}
                className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                placeholder="±"
              />
              <span className="text-xs text-gray-500">
                New cost: {(data.links[selectedLinkIndex].forward_cost ?? data.links[selectedLinkIndex].cost) + costChange}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!selectedLinkIndex ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Waves className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Select a link to analyze its ripple effect on the network</p>
              </div>
            </div>
          ) : rippleAnalysis ? (
            <>
              {/* Impact Level Tabs */}
              <div className="w-64 border-r border-gray-800 p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Impact Levels</h3>
                <div className="space-y-2">
                  {([1, 2, 3] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setActiveLevel(level)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        activeLevel === level
                          ? 'bg-indigo-900/30 border-indigo-500/50'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className={`w-4 h-4 ${activeLevel === level ? 'text-indigo-400' : 'text-gray-400'}`} />
                        <span className="font-medium text-white">Level {level}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {level === 1 && 'Direct impact on connected nodes'}
                        {level === 2 && 'Indirect impact via path changes'}
                        {level === 3 && 'Network-wide cascade effects'}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-6 space-y-3">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Paths Affected</div>
                    <div className="text-xl font-bold text-white">{rippleAnalysis.level3Impact.totalPathsAffected}</div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Avg Cost Change</div>
                    <div className={`text-xl font-bold ${
                      rippleAnalysis.level3Impact.avgNetworkCostChange > 0 ? 'text-red-400' :
                      rippleAnalysis.level3Impact.avgNetworkCostChange < 0 ? 'text-green-400' : 'text-white'
                    }`}>
                      {rippleAnalysis.level3Impact.avgNetworkCostChange > 0 ? '+' : ''}
                      {rippleAnalysis.level3Impact.avgNetworkCostChange.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Level Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeLevel === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Level 1: Direct Impact</h3>
                    <p className="text-sm text-gray-400">
                      Nodes directly connected to the modified link
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {rippleAnalysis.level1Impact.nodes.map(nodeId => {
                        const node = data.nodes.find(n => n.id === nodeId);
                        return (
                          <div
                            key={nodeId}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COUNTRY_COLORS[node?.country || ''] || '#6b7280' }}
                              />
                              <span className="font-bold text-white">{nodeId}</span>
                            </div>
                            <div className="text-sm text-gray-400">
                              Country: {node?.country || 'Unknown'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                      <div className="text-sm text-indigo-300">
                        Direct cost change: <span className={costChange > 0 ? 'text-red-400' : 'text-green-400'}>
                          {costChange > 0 ? '+' : ''}{costChange}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Original: {rippleAnalysis.originalCost} → New: {rippleAnalysis.newCost}
                      </div>
                    </div>
                  </div>
                )}

                {activeLevel === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Level 2: Indirect Impact</h3>
                    <p className="text-sm text-gray-400">
                      Nodes and paths affected through routing changes
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Paths Rerouted</div>
                        <div className="text-xl font-bold text-white">{rippleAnalysis.level2Impact.pathsRerouted}</div>
                      </div>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Nodes Affected</div>
                        <div className="text-xl font-bold text-white">{rippleAnalysis.level2Impact.nodes.length}</div>
                      </div>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Transit Changes</div>
                        <div className="text-xl font-bold text-white">
                          {rippleAnalysis.level2Impact.newTransitCountries.length + rippleAnalysis.level2Impact.removedTransitCountries.length}
                        </div>
                      </div>
                    </div>

                    {/* Transit Country Changes */}
                    {(rippleAnalysis.level2Impact.newTransitCountries.length > 0 || rippleAnalysis.level2Impact.removedTransitCountries.length > 0) && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-3">Transit Country Changes</h4>
                        <div className="flex gap-4">
                          {rippleAnalysis.level2Impact.newTransitCountries.length > 0 && (
                            <div>
                              <div className="text-xs text-green-400 mb-1">+ New Transit</div>
                              <div className="flex flex-wrap gap-1">
                                {rippleAnalysis.level2Impact.newTransitCountries.map(tc => (
                                  <span key={tc} className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-300">
                                    {tc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {rippleAnalysis.level2Impact.removedTransitCountries.length > 0 && (
                            <div>
                              <div className="text-xs text-red-400 mb-1">- Removed Transit</div>
                              <div className="flex flex-wrap gap-1">
                                {rippleAnalysis.level2Impact.removedTransitCountries.map(tc => (
                                  <span key={tc} className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-300">
                                    {tc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeLevel === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Level 3: Network-Wide Impact</h3>
                    <p className="text-sm text-gray-400">
                      Full network analysis including cascade effects
                    </p>

                    {/* Cascade Risk */}
                    {rippleAnalysis.level3Impact.cascadeRisk.length > 0 && (
                      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-orange-400 mb-3">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Cascade Risk Detected</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          These links will receive additional traffic due to the change:
                        </p>
                        <div className="space-y-2">
                          {rippleAnalysis.level3Impact.cascadeRisk.map((risk, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2"
                            >
                              <span className="text-sm text-white">
                                {risk.sourceId} ↔ {risk.targetId}
                              </span>
                              <span className="text-sm text-orange-400">
                                +{risk.newLoad} paths
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Before/After Comparison */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                        Path Changes ({rippleAnalysis.beforeAfterComparison.length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {rippleAnalysis.beforeAfterComparison.slice(0, 20).map((comp, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COUNTRY_COLORS[comp.sourceCountry] || '#6b7280' }}
                                />
                                <span className="text-white">{comp.sourceCountry}</span>
                                <ArrowRight className="w-3 h-3 text-gray-500" />
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COUNTRY_COLORS[comp.destCountry] || '#6b7280' }}
                                />
                                <span className="text-white">{comp.destCountry}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {comp.afterCost > comp.beforeCost ? (
                                  <TrendingUp className="w-4 h-4 text-red-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-green-400" />
                                )}
                                <span className={`text-sm ${
                                  comp.afterCost > comp.beforeCost ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  {comp.beforeCost} → {comp.afterCost}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              <div>Before: {comp.beforePath.join(' → ')}</div>
                              <div>After: {comp.afterPath.join(' → ')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RippleEffectModal;
