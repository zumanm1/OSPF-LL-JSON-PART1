import React, { useMemo } from 'react';
import { NetworkData } from '../types';
import { calculateLinkImpact } from '../utils/impactAnalysis';
import { X, AlertTriangle, TrendingUp, Activity, Zap, Network as NetworkIcon, Download } from 'lucide-react';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface ImpactAnalysisModalProps {
  originalData: NetworkData;
  currentData: NetworkData;
  onClose: () => void;
}

const ImpactAnalysisModal: React.FC<ImpactAnalysisModalProps> = ({
  originalData,
  currentData,
  onClose
}) => {

  const impactAnalysis = useMemo(() => {
    return calculateLinkImpact(
      currentData.nodes,
      originalData.links,
      currentData.links
    );
  }, [originalData, currentData]);

  const hasChanges = impactAnalysis.linkImpacts.length > 0;

  const handleExport = () => {
    if (!hasChanges) return;

    const exportData = impactAnalysis.linkImpacts.map((impact) => {
      const sourceId = typeof impact.link.source === 'object' ? impact.link.source.id : impact.link.source;
      const targetId = typeof impact.link.target === 'object' ? impact.link.target.id : impact.link.target;
      const origLink = originalData.links[impact.linkIndex];

      return {
        link: `${sourceId} ↔ ${targetId}`,
        interfaces: `${impact.link.source_interface} - ${impact.link.target_interface}`,
        status: impact.link.status,
        origForwardCost: origLink.forward_cost,
        newForwardCost: impact.link.forward_cost,
        origReverseCost: origLink.reverse_cost,
        newReverseCost: impact.link.reverse_cost,
        localImpactNodes: impact.localImpact.join(', '),
        downstreamImpactNodes: impact.downstreamImpact.join(', '),
        affectedPairs: impact.affectedCountryPairs.length,
        affectedPairsList: impact.affectedCountryPairs.map(p => `${p.source}→${p.dest}`).join('; '),
      };
    });

    const columns: ExportColumn[] = [
      { header: 'Link', key: 'link' },
      { header: 'Interfaces', key: 'interfaces' },
      { header: 'Status', key: 'status' },
      { header: 'Original Forward Cost', key: 'origForwardCost' },
      { header: 'New Forward Cost', key: 'newForwardCost' },
      { header: 'Original Reverse Cost', key: 'origReverseCost' },
      { header: 'New Reverse Cost', key: 'newReverseCost' },
      { header: 'Local Impact Nodes', key: 'localImpactNodes' },
      { header: 'Downstream Impact Nodes', key: 'downstreamImpactNodes' },
      { header: 'Affected Country Pairs Count', key: 'affectedPairs' },
      { header: 'Affected Country Pairs', key: 'affectedPairsList' },
    ];

    exportToCSV(exportData, columns, 'impact_analysis');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              Multi-Country Impact Analysis
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Downstream Ripple Effect - How link changes affect network paths
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <NetworkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <p className="text-xs text-gray-500 font-semibold">Total Paths</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{impactAnalysis.totalPaths}</p>
            </div>

            <div className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <p className="text-xs text-gray-500 font-semibold">Affected Paths</p>
              </div>
              <p className="text-3xl font-bold text-amber-500 dark:text-amber-400">{impactAnalysis.affectedPaths}</p>
            </div>

            <div className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Impact %</p>
              </div>
              <p className="text-3xl font-bold text-purple-500 dark:text-purple-400">
                {impactAnalysis.impactPercentage.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-500 dark:text-green-400" />
                <p className="text-xs text-gray-500 font-semibold">Modified Links</p>
              </div>
              <p className="text-3xl font-bold text-green-500 dark:text-green-400">{impactAnalysis.linkImpacts.length}</p>
            </div>
          </div>
        </div>

        {/* Impact Details */}
        <div className="flex-1 overflow-auto p-6">
          {!hasChanges ? (
            <div className="text-center text-gray-500 py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No link modifications detected</p>
              <p className="text-sm mt-2">Enter simulation mode and modify link costs to see impact analysis</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Modified Links */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Modified Links</h3>
                <div className="space-y-3">
                  {impactAnalysis.linkImpacts.map((impact, idx) => {
                    const sourceId = typeof impact.link.source === 'object' ? impact.link.source.id : impact.link.source;
                    const targetId = typeof impact.link.target === 'object' ? impact.link.target.id : impact.link.target;
                    const origLink = originalData.links[impact.linkIndex];

                    return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{sourceId} ↔ {targetId}</span>
                            <span className="text-xs text-gray-500 font-mono">
                              {impact.link.source_interface} - {impact.link.target_interface}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {impact.link.status === 'down' ? (
                              <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs font-bold rounded border border-red-500/30">
                                DOWN
                              </span>
                            ) : (
                              <>
                                <span className="text-xs text-gray-500">
                                  Forward: <span className="text-blue-500 dark:text-blue-400 font-bold">{origLink.forward_cost}</span> → <span className="text-green-500 dark:text-green-400 font-bold">{impact.link.forward_cost}</span>
                                </span>
                                <span className="text-gray-400 dark:text-gray-700">|</span>
                                <span className="text-xs text-gray-500">
                                  Reverse: <span className="text-blue-500 dark:text-blue-400 font-bold">{origLink.reverse_cost}</span> → <span className="text-green-500 dark:text-green-400 font-bold">{impact.link.reverse_cost}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 mb-1">Local Impact</p>
                            <p className="text-sm font-bold text-blue-500 dark:text-blue-400">{impact.localImpact.length} nodes</p>
                            <p className="text-xs text-gray-600 mt-1">{impact.localImpact.join(', ')}</p>
                          </div>

                          <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 mb-1">Downstream Impact</p>
                            <p className="text-sm font-bold text-purple-500 dark:text-purple-400">{impact.downstreamImpact.length} nodes</p>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {impact.downstreamImpact.slice(0, 5).join(', ')}
                              {impact.downstreamImpact.length > 5 && '...'}
                            </p>
                          </div>

                          <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 mb-1">Affected Country Pairs</p>
                            <p className="text-sm font-bold text-amber-500 dark:text-amber-400">{impact.affectedCountryPairs.length} pairs</p>
                          </div>
                        </div>

                        {/* Affected Country Pairs Details */}
                        {impact.affectedCountryPairs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <p className="text-xs text-gray-500 mb-2 font-semibold">Affected Routes:</p>
                            <div className="flex flex-wrap gap-2">
                              {impact.affectedCountryPairs.map((pair, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2 py-1 bg-amber-900/20 text-amber-400 text-xs rounded border border-amber-500/30"
                                >
                                  {pair.source} → {pair.dest} ({pair.pathCount} paths)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Country Pair Impact Summary */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Country Pair Impact Summary</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from(impactAnalysis.countryPairImpacts.entries())
                      .filter(([_, impact]) => impact.changed)
                      .map(([pairKey, impact]) => (
                        <div key={pairKey} className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{pairKey}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {impact.before.length} → {impact.after.length} paths
                            </span>
                            {impact.before.length !== impact.after.length && (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {Array.from(impactAnalysis.countryPairImpacts.values()).filter((i: any) => i.changed).length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No country pairs affected</p>
                  )}
                </div>
              </div>

              {/* Level 4: Transit Country Analysis */}
              {impactAnalysis.transitCountries.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <NetworkIcon className="w-4 h-4" />
                    Transit Countries (Level 4 Impact)
                  </h3>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-500/30">
                    <p className="text-xs text-gray-400 mb-4">
                      Countries serving as transit hubs for traffic between other countries. Higher criticality scores indicate greater strategic importance.
                    </p>
                    <div className="space-y-3">
                      {impactAnalysis.transitCountries.map((transit, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-purple-600 dark:text-purple-300">{transit.country}</span>
                              <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold rounded border border-purple-500/30">
                                Criticality: {transit.criticalityScore}%
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{transit.transitPathCount} transit paths</span>
                              <span className="text-gray-700">|</span>
                              <span>{transit.nodeCount} nodes involved</span>
                            </div>
                          </div>

                          {/* Criticality Bar */}
                          <div className="mb-3">
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                                style={{ width: `${transit.criticalityScore}%` }}
                              />
                            </div>
                          </div>

                          {/* Transit For Pairs */}
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-semibold">Serves as transit for:</p>
                            <div className="flex flex-wrap gap-2">
                              {transit.transitForPairs.slice(0, 6).map((pair, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-700"
                                >
                                  {pair.source} → {pair.dest} ({pair.pathCount})
                                </span>
                              ))}
                              {transit.transitForPairs.length > 6 && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded border border-gray-200 dark:border-gray-700">
                                  +{transit.transitForPairs.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>
                <strong className="text-blue-400">Local Impact:</strong> Directly connected nodes
              </span>
              <span>
                <strong className="text-purple-400">Downstream Impact:</strong> Nodes affected through path changes
              </span>
            </div>
            <span className="text-gray-600">
              Analysis based on shortest path calculations
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImpactAnalysisModal;
