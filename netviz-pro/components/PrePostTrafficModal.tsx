import React, { useState, useMemo } from 'react';
import { X, GitCompare, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus, Play, RefreshCw, Download } from 'lucide-react';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';
import { NetworkData, NetworkNode, TrafficData } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { COUNTRY_COLORS } from '../constants';

interface PrePostTrafficModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface LinkChange {
  linkIndex: number;
  newForwardCost: number;
  newReverseCost: number;
  disable: boolean;
}

interface TrafficImpact {
  linkIndex: number;
  sourceId: string;
  targetId: string;
  beforeForwardUtil: number;
  beforeReverseUtil: number;
  afterForwardUtil: number;
  afterReverseUtil: number;
  changeForward: number;
  changeReverse: number;
  willCongest: boolean;
  capacity: number;
}

const PrePostTrafficModal: React.FC<PrePostTrafficModalProps> = ({ data, onClose }) => {
  const [linkChanges, setLinkChanges] = useState<LinkChange[]>([]);
  const [selectedLinkToChange, setSelectedLinkToChange] = useState<number | null>(null);
  const [analysisRun, setAnalysisRun] = useState(false);

  const getNodeId = (node: string | NetworkNode): string => {
    return typeof node === 'string' ? node : node.id;
  };

  const getNodeCountry = (nodeId: string): string => {
    const node = data.nodes.find(n => n.id === nodeId);
    return node?.country || 'Unknown';
  };

  // Build modified data for "after" scenario
  const modifiedData = useMemo(() => {
    if (linkChanges.length === 0) return data;

    const newLinks = data.links.map((link, index) => {
      const change = linkChanges.find(c => c.linkIndex === index);
      if (change) {
        return {
          ...link,
          forward_cost: change.disable ? 10000 : change.newForwardCost,
          reverse_cost: change.disable ? 10000 : change.newReverseCost,
          status: change.disable ? 'down' : link.status
        };
      }
      return link;
    });

    return { ...data, links: newLinks };
  }, [data, linkChanges]);

  // Calculate traffic impact
  const trafficImpact = useMemo((): TrafficImpact[] => {
    if (!analysisRun || linkChanges.length === 0) return [];

    const impacts: TrafficImpact[] = [];
    const countries = Array.from(new Set(data.nodes.map(n => n.country)));

    // Track link usage before and after
    const beforeUsage: Record<number, number> = {};
    const afterUsage: Record<number, number> = {};

    // Initialize with current traffic
    data.links.forEach((link, idx) => {
      const fwdTraffic = link.traffic?.forward_traffic_mbps || 0;
      const revTraffic = link.traffic?.reverse_traffic_mbps || 0;
      beforeUsage[idx] = fwdTraffic + revTraffic;
      afterUsage[idx] = fwdTraffic + revTraffic;
    });

    // For each country pair, calculate path changes
    countries.forEach(srcCountry => {
      countries.forEach(dstCountry => {
        if (srcCountry === dstCountry) return;

        const srcNodes = data.nodes.filter(n => n.country === srcCountry);
        const dstNodes = data.nodes.filter(n => n.country === dstCountry);

        srcNodes.forEach(srcNode => {
          dstNodes.forEach(dstNode => {
            // Get paths before
            const beforePaths = findAllPaths(data.nodes, data.links, srcNode.id, dstNode.id);
            // Get paths after
            const afterPaths = findAllPaths(modifiedData.nodes, modifiedData.links, srcNode.id, dstNode.id);

            if (beforePaths.length > 0 && afterPaths.length > 0) {
              const beforePath = beforePaths[0];
              const afterPath = afterPaths[0];

              // Check if path changed
              const pathChanged = JSON.stringify(beforePath.nodes) !== JSON.stringify(afterPath.nodes);

              if (pathChanged) {
                // Estimate traffic shift (simplified: assume uniform distribution)
                const estimatedTraffic = 1000; // Base traffic unit

                // Reduce usage on old path links
                for (let i = 0; i < beforePath.nodes.length - 1; i++) {
                  const from = beforePath.nodes[i];
                  const to = beforePath.nodes[i + 1];
                  const linkIdx = data.links.findIndex(l => {
                    const s = getNodeId(l.source);
                    const t = getNodeId(l.target);
                    return (s === from && t === to) || (s === to && t === from);
                  });
                  if (linkIdx >= 0) {
                    afterUsage[linkIdx] -= estimatedTraffic;
                  }
                }

                // Increase usage on new path links
                for (let i = 0; i < afterPath.nodes.length - 1; i++) {
                  const from = afterPath.nodes[i];
                  const to = afterPath.nodes[i + 1];
                  const linkIdx = modifiedData.links.findIndex(l => {
                    const s = getNodeId(l.source);
                    const t = getNodeId(l.target);
                    return (s === from && t === to) || (s === to && t === from);
                  });
                  if (linkIdx >= 0) {
                    afterUsage[linkIdx] += estimatedTraffic;
                  }
                }
              }
            }
          });
        });
      });
    });

    // Calculate impact for each link
    data.links.forEach((link, idx) => {
      const capacity = link.source_capacity?.total_capacity_mbps || 10000;
      const beforeFwdUtil = link.traffic?.forward_utilization_pct || 0;
      const beforeRevUtil = link.traffic?.reverse_utilization_pct || 0;

      // Calculate after utilization based on traffic shift
      const trafficChange = afterUsage[idx] - beforeUsage[idx];
      const afterFwdUtil = Math.max(0, Math.min(100, beforeFwdUtil + (trafficChange / capacity) * 100 * 0.5));
      const afterRevUtil = Math.max(0, Math.min(100, beforeRevUtil + (trafficChange / capacity) * 100 * 0.5));

      const changeFwd = afterFwdUtil - beforeFwdUtil;
      const changeRev = afterRevUtil - beforeRevUtil;

      // Check if significant change or will congest
      if (Math.abs(changeFwd) > 1 || Math.abs(changeRev) > 1 || afterFwdUtil > 80 || afterRevUtil > 80) {
        impacts.push({
          linkIndex: idx,
          sourceId: getNodeId(link.source),
          targetId: getNodeId(link.target),
          beforeForwardUtil: beforeFwdUtil,
          beforeReverseUtil: beforeRevUtil,
          afterForwardUtil: afterFwdUtil,
          afterReverseUtil: afterRevUtil,
          changeForward: changeFwd,
          changeReverse: changeRev,
          willCongest: afterFwdUtil > 80 || afterRevUtil > 80,
          capacity
        });
      }
    });

    // Sort by impact magnitude
    impacts.sort((a, b) => {
      const aMax = Math.max(Math.abs(a.changeForward), Math.abs(a.changeReverse));
      const bMax = Math.max(Math.abs(b.changeForward), Math.abs(b.changeReverse));
      return bMax - aMax;
    });

    return impacts;
  }, [data, modifiedData, analysisRun, linkChanges]);

  // Add link change
  const addLinkChange = (linkIndex: number, forwardCost: number, reverseCost: number, disable: boolean) => {
    setLinkChanges(prev => {
      const existing = prev.findIndex(c => c.linkIndex === linkIndex);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { linkIndex, newForwardCost: forwardCost, newReverseCost: reverseCost, disable };
        return updated;
      }
      return [...prev, { linkIndex, newForwardCost: forwardCost, newReverseCost: reverseCost, disable }];
    });
    setSelectedLinkToChange(null);
    setAnalysisRun(false);
  };

  const removeLinkChange = (linkIndex: number) => {
    setLinkChanges(prev => prev.filter(c => c.linkIndex !== linkIndex));
    setAnalysisRun(false);
  };

  const runAnalysis = () => {
    setAnalysisRun(true);
  };

  const resetAnalysis = () => {
    setLinkChanges([]);
    setAnalysisRun(false);
  };

  const getChangeIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (change < -5) return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getUtilColor = (util: number): string => {
    if (util >= 90) return 'text-red-400';
    if (util >= 70) return 'text-orange-400';
    if (util >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const congestionWarnings = trafficImpact.filter(i => i.willCongest);

  const handleExport = () => {
    if (trafficImpact.length === 0) return;

    const exportData = trafficImpact.map(impact => ({
      link: `${impact.sourceId} → ${impact.targetId}`,
      beforeForward: `${impact.beforeForwardUtil.toFixed(1)}%`,
      beforeReverse: `${impact.beforeReverseUtil.toFixed(1)}%`,
      afterForward: `${impact.afterForwardUtil.toFixed(1)}%`,
      afterReverse: `${impact.afterReverseUtil.toFixed(1)}%`,
      changeForward: `${impact.changeForward > 0 ? '+' : ''}${impact.changeForward.toFixed(1)}%`,
      changeReverse: `${impact.changeReverse > 0 ? '+' : ''}${impact.changeReverse.toFixed(1)}%`,
      capacity: impact.capacity,
      status: impact.willCongest ? 'Will Congest' : (Math.abs(impact.changeForward) > 10 || Math.abs(impact.changeReverse) > 10) ? 'High Impact' : 'OK',
    }));

    const columns: ExportColumn[] = [
      { header: 'Link', key: 'link' },
      { header: 'Before Forward Util', key: 'beforeForward' },
      { header: 'Before Reverse Util', key: 'beforeReverse' },
      { header: 'After Forward Util', key: 'afterForward' },
      { header: 'After Reverse Util', key: 'afterReverse' },
      { header: 'Forward Change', key: 'changeForward' },
      { header: 'Reverse Change', key: 'changeReverse' },
      { header: 'Capacity (Mbps)', key: 'capacity' },
      { header: 'Status', key: 'status' },
    ];

    exportToCSV(exportData, columns, 'pre_post_traffic_analysis');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <GitCompare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pre/Post Traffic Analyzer</h2>
              <p className="text-xs text-gray-400">Simulate routing changes and predict traffic impact</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysisRun && trafficImpact.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Link Changes */}
          <div className="w-1/3 border-r border-gray-800 flex flex-col">
            <div className="p-3 border-b border-gray-800 bg-gray-800/30">
              <h3 className="text-sm font-medium text-gray-300">Planned Changes</h3>
            </div>

            {/* Current Changes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {linkChanges.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No changes planned. Select a link below to add changes.
                </p>
              ) : (
                linkChanges.map(change => {
                  const link = data.links[change.linkIndex];
                  return (
                    <div key={change.linkIndex} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">
                          {getNodeId(link.source)} → {getNodeId(link.target)}
                        </span>
                        <button
                          onClick={() => removeLinkChange(change.linkIndex)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        {change.disable ? (
                          <span className="text-red-400">Link disabled</span>
                        ) : (
                          <span>Cost: {change.newForwardCost}/{change.newReverseCost}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Link Selector */}
            <div className="p-3 border-t border-gray-800">
              <select
                value={selectedLinkToChange ?? ''}
                onChange={(e) => setSelectedLinkToChange(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 mb-2"
              >
                <option value="">Select link to modify...</option>
                {data.links.map((link, idx) => (
                  <option key={idx} value={idx}>
                    {getNodeId(link.source)} ↔ {getNodeId(link.target)} (Cost: {link.forward_cost}/{link.reverse_cost})
                  </option>
                ))}
              </select>

              {selectedLinkToChange !== null && (
                <div className="space-y-2">
                  <button
                    onClick={() => addLinkChange(selectedLinkToChange, data.links[selectedLinkToChange].forward_cost || 10, data.links[selectedLinkToChange].reverse_cost || 10, true)}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs"
                  >
                    Disable Link
                  </button>
                  <button
                    onClick={() => {
                      const link = data.links[selectedLinkToChange];
                      addLinkChange(selectedLinkToChange, (link.forward_cost || 10) * 2, (link.reverse_cost || 10) * 2, false);
                    }}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs"
                  >
                    Double Cost
                  </button>
                  <button
                    onClick={() => {
                      const link = data.links[selectedLinkToChange];
                      addLinkChange(selectedLinkToChange, Math.floor((link.forward_cost || 10) / 2), Math.floor((link.reverse_cost || 10) / 2), false);
                    }}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs"
                  >
                    Halve Cost
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t border-gray-800 space-y-2">
              <button
                onClick={runAnalysis}
                disabled={linkChanges.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium ${
                  linkChanges.length === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                Run Analysis
              </button>
              <button
                onClick={resetAnalysis}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Congestion Warnings */}
            {congestionWarnings.length > 0 && (
              <div className="p-3 bg-red-500/10 border-b border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Congestion Warning</span>
                </div>
                <p className="text-xs text-red-300">
                  {congestionWarnings.length} link(s) will exceed 80% utilization after changes
                </p>
              </div>
            )}

            {/* Results Table */}
            <div className="flex-1 overflow-auto">
              {!analysisRun ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Configure changes and click "Run Analysis" to see traffic impact
                </div>
              ) : trafficImpact.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No significant traffic changes detected
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-gray-400 font-medium">Link</th>
                      <th className="text-center p-3 text-gray-400 font-medium">Before (Fwd/Rev)</th>
                      <th className="text-center p-3 text-gray-400 font-medium">After (Fwd/Rev)</th>
                      <th className="text-center p-3 text-gray-400 font-medium">Change</th>
                      <th className="text-center p-3 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficImpact.map(impact => (
                      <tr key={impact.linkIndex} className={`border-b border-gray-800 ${impact.willCongest ? 'bg-red-500/10' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COUNTRY_COLORS[getNodeCountry(impact.sourceId)] || COUNTRY_COLORS.DEFAULT }}
                            />
                            <span className="text-gray-200">{impact.sourceId}</span>
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COUNTRY_COLORS[getNodeCountry(impact.targetId)] || COUNTRY_COLORS.DEFAULT }}
                            />
                            <span className="text-gray-200">{impact.targetId}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={getUtilColor(impact.beforeForwardUtil)}>
                            {impact.beforeForwardUtil.toFixed(0)}%
                          </span>
                          <span className="text-gray-500 mx-1">/</span>
                          <span className={getUtilColor(impact.beforeReverseUtil)}>
                            {impact.beforeReverseUtil.toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={getUtilColor(impact.afterForwardUtil)}>
                            {impact.afterForwardUtil.toFixed(0)}%
                          </span>
                          <span className="text-gray-500 mx-1">/</span>
                          <span className={getUtilColor(impact.afterReverseUtil)}>
                            {impact.afterReverseUtil.toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getChangeIcon(impact.changeForward)}
                            <span className={impact.changeForward > 0 ? 'text-red-400' : impact.changeForward < 0 ? 'text-green-400' : 'text-gray-400'}>
                              {impact.changeForward > 0 ? '+' : ''}{impact.changeForward.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {impact.willCongest ? (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                              Will Congest
                            </span>
                          ) : impact.changeForward > 10 || impact.changeReverse > 10 ? (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                              High Impact
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrePostTrafficModal;
