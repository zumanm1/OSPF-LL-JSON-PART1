import React, { useState, useMemo } from 'react';
import { NetworkData, PathResult, NetworkLink } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Share2, ArrowRight, AlertTriangle, Activity, Layers, ZapOff, AlertCircle, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface TrafficFlowModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface LinkTrafficData {
  linkIndex: number;
  link: NetworkLink;
  sourceId: string;
  targetId: string;
  pathsUsingLink: PathResult[];
  trafficScore: number;
  isSinglePointOfFailure: boolean;
  isUnused: boolean;
  isHeavyLoad: boolean;
}

const TrafficFlowModal: React.FC<TrafficFlowModalProps> = ({ data, onClose }) => {
  const [sourceCountry, setSourceCountry] = useState<string>('');
  const [destCountry, setDestCountry] = useState<string>('');
  const [selectedLink, setSelectedLink] = useState<LinkTrafficData | null>(null);

  // Get all countries
  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  // Analyze traffic flow
  const trafficAnalysis = useMemo(() => {
    if (!sourceCountry || !destCountry || sourceCountry === destCountry) {
      return { linkTraffic: [], allPaths: [], totalPaths: 0 };
    }

    const sourceNodes = data.nodes.filter(n => n.country === sourceCountry);
    const destNodes = data.nodes.filter(n => n.country === destCountry);
    const allPaths: PathResult[] = [];

    // Get all paths between country pair
    sourceNodes.forEach(sNode => {
      destNodes.forEach(dNode => {
        const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 5);
        allPaths.push(...paths);
      });
    });

    // Analyze each link
    const linkTraffic: LinkTrafficData[] = data.links.map((link, index) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      // Find paths using this link
      const pathsUsingLink = allPaths.filter(path => {
        for (let i = 0; i < path.nodes.length - 1; i++) {
          if ((path.nodes[i] === sourceId && path.nodes[i + 1] === targetId) ||
              (path.nodes[i] === targetId && path.nodes[i + 1] === sourceId)) {
            return true;
          }
        }
        return false;
      });

      const trafficScore = allPaths.length > 0 ? (pathsUsingLink.length / allPaths.length) * 100 : 0;
      const isUnused = pathsUsingLink.length === 0;
      const isSinglePointOfFailure = pathsUsingLink.length > 0 && pathsUsingLink.length === allPaths.length;
      const isHeavyLoad = trafficScore >= 50;

      return {
        linkIndex: index,
        link,
        sourceId,
        targetId,
        pathsUsingLink,
        trafficScore,
        isSinglePointOfFailure,
        isUnused,
        isHeavyLoad
      };
    });

    return {
      linkTraffic: linkTraffic.sort((a, b) => b.pathsUsingLink.length - a.pathsUsingLink.length),
      allPaths,
      totalPaths: allPaths.length
    };
  }, [data, sourceCountry, destCountry]);

  // Get traffic color
  const getTrafficColor = (traffic: LinkTrafficData) => {
    if (traffic.isUnused) return 'bg-gray-700';
    if (traffic.isSinglePointOfFailure) return 'bg-red-600';
    if (traffic.isHeavyLoad) return 'bg-orange-500';
    if (traffic.trafficScore > 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Stats
  const stats = useMemo(() => {
    const usedLinks = trafficAnalysis.linkTraffic.filter(l => !l.isUnused);
    const spof = trafficAnalysis.linkTraffic.filter(l => l.isSinglePointOfFailure);
    const heavy = trafficAnalysis.linkTraffic.filter(l => l.isHeavyLoad && !l.isSinglePointOfFailure);

    return {
      usedLinks: usedLinks.length,
      unusedLinks: trafficAnalysis.linkTraffic.length - usedLinks.length,
      singlePoints: spof.length,
      heavyLoad: heavy.length
    };
  }, [trafficAnalysis]);

  const handleExport = () => {
    if (!trafficAnalysis || trafficAnalysis.linkTraffic.length === 0) return;

    const exportData = trafficAnalysis.linkTraffic.map(traffic => ({
      source: traffic.sourceId,
      target: traffic.targetId,
      forwardCost: traffic.link.forward_cost ?? traffic.link.cost,
      reverseCost: traffic.link.reverse_cost ?? traffic.link.forward_cost ?? traffic.link.cost,
      pathsUsing: traffic.pathsUsingLink.length,
      trafficScore: traffic.trafficScore.toFixed(1),
      isUnused: traffic.isUnused ? 'Yes' : 'No',
      isSPOF: traffic.isSinglePointOfFailure ? 'Yes' : 'No',
      isHeavyLoad: traffic.isHeavyLoad ? 'Yes' : 'No',
    }));

    const columns: ExportColumn[] = [
      { header: 'Source Node', key: 'source' },
      { header: 'Target Node', key: 'target' },
      { header: 'Forward Cost', key: 'forwardCost' },
      { header: 'Reverse Cost', key: 'reverseCost' },
      { header: 'Paths Using', key: 'pathsUsing' },
      { header: 'Traffic Score %', key: 'trafficScore' },
      { header: 'Unused', key: 'isUnused' },
      { header: 'Single Point of Failure', key: 'isSPOF' },
      { header: 'Heavy Load', key: 'isHeavyLoad' },
    ];

    exportToCSV(exportData, columns, `traffic_flow_${sourceCountry}_to_${destCountry}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-6 h-6 text-pink-400" />
              Traffic Flow Analyzer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Visualize which links carry traffic for specific country pairs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sourceCountry && destCountry && trafficAnalysis.linkTraffic.length > 0 && (
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

        {/* Country Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Source:</span>
            <select
              value={sourceCountry}
              onChange={(e) => setSourceCountry(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select source...</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-500" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Destination:</span>
            <select
              value={destCountry}
              onChange={(e) => setDestCountry(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select destination...</option>
              {countries.filter(c => c !== sourceCountry).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {trafficAnalysis.totalPaths > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
              {trafficAnalysis.totalPaths} paths found
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!sourceCountry || !destCountry ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Share2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Select source and destination countries to analyze traffic flow</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Traffic Summary</h3>

                <div className="space-y-3">
                  <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                      <Activity className="w-4 h-4" />
                      Active Links
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.usedLinks}</p>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                      <ZapOff className="w-4 h-4" />
                      Unused Links
                    </div>
                    <p className="text-xl font-bold text-gray-500">{stats.unusedLinks}</p>
                  </div>

                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Single Points of Failure
                    </div>
                    <p className="text-xl font-bold text-red-400">{stats.singlePoints}</p>
                  </div>

                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-orange-400 text-xs mb-1">
                      <Layers className="w-4 h-4" />
                      Heavy Load Links
                    </div>
                    <p className="text-xl font-bold text-orange-400">{stats.heavyLoad}</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-red-600"></span>
                      <span className="text-gray-700 dark:text-gray-300">Single Point of Failure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-orange-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Heavy Load (50%+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-yellow-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Moderate (20-50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-green-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Light (&lt;20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-gray-700"></span>
                      <span className="text-gray-700 dark:text-gray-300">Unused</span>
                    </div>
                  </div>
                </div>

                {/* Bottleneck Detection */}
                {stats.singlePoints > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">
                      Bottleneck Detection
                    </h4>
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-300 font-medium">Warning</span>
                      </div>
                      <p className="text-xs text-red-200/80">
                        {stats.singlePoints} link{stats.singlePoints > 1 ? 's' : ''} carrying ALL traffic.
                        If {stats.singlePoints > 1 ? 'any of these fail' : 'this fails'}, no alternative paths exist.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Links List */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                  Link Traffic Analysis
                </h3>

                <div className="space-y-2">
                  {trafficAnalysis.linkTraffic.map(traffic => (
                    <button
                      key={traffic.linkIndex}
                      onClick={() => setSelectedLink(traffic)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedLink?.linkIndex === traffic.linkIndex
                          ? 'bg-blue-900/30 border-blue-500/50'
                          : traffic.isUnused
                          ? 'bg-gray-800/30 border-gray-700/50 opacity-60'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-8 rounded ${getTrafficColor(traffic)}`}
                            style={{ width: `${Math.max(4, traffic.trafficScore / 5)}px` }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COUNTRY_COLORS[data.nodes.find(n => n.id === traffic.sourceId)?.country || ''] || '#6b7280' }}
                              />
                              <span className="text-gray-900 dark:text-white font-medium">{traffic.sourceId}</span>
                              <ArrowRight className="w-3 h-3 text-gray-500" />
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COUNTRY_COLORS[data.nodes.find(n => n.id === traffic.targetId)?.country || ''] || '#6b7280' }}
                              />
                              <span className="text-gray-900 dark:text-white font-medium">{traffic.targetId}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {traffic.pathsUsingLink.length} paths • Cost: {traffic.link.forward_cost ?? traffic.link.cost}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {traffic.isSinglePointOfFailure && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">
                              SPOF
                            </span>
                          )}
                          {traffic.isHeavyLoad && !traffic.isSinglePointOfFailure && (
                            <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-300">
                              Heavy
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            traffic.isUnused ? 'bg-gray-700 text-gray-400' :
                            'bg-gray-700 text-white'
                          }`}>
                            {traffic.trafficScore.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Traffic bar */}
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getTrafficColor(traffic)}`}
                          style={{ width: `${Math.max(2, traffic.trafficScore)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link Detail Panel */}
              {selectedLink && (
                <div className="w-80 border-l border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Link Details</h3>
                    <button
                      onClick={() => setSelectedLink(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Link Info */}
                  <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                    <div className="text-center mb-2">
                      <span className="text-gray-900 dark:text-white font-medium">{selectedLink.sourceId}</span>
                      <span className="text-gray-500 mx-2">↔</span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedLink.targetId}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Forward Cost:</span>
                        <span className="text-white ml-1">{selectedLink.link.forward_cost ?? selectedLink.link.cost}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Reverse Cost:</span>
                        <span className="text-white ml-1">{selectedLink.link.reverse_cost ?? selectedLink.link.forward_cost ?? selectedLink.link.cost}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={`ml-1 ${selectedLink.link.status === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedLink.link.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Traffic:</span>
                        <span className="text-white ml-1">{selectedLink.trafficScore.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {selectedLink.isSinglePointOfFailure && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Single Point of Failure</span>
                      </div>
                      <p className="text-xs text-red-200/80">
                        ALL paths between {sourceCountry} and {destCountry} use this link.
                        If it fails, there are no alternative routes.
                      </p>
                    </div>
                  )}

                  {/* Paths Using This Link */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                      Paths Using This Link ({selectedLink.pathsUsingLink.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedLink.pathsUsingLink.slice(0, 15).map((path, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-100 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 rounded-lg p-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Path #{idx + 1}</span>
                            <span className="text-xs text-white">Cost: {path.totalCost}</span>
                          </div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {path.nodes.join(' → ')}
                          </div>
                        </div>
                      ))}
                      {selectedLink.pathsUsingLink.length > 15 && (
                        <div className="text-xs text-gray-500 text-center py-2">
                          +{selectedLink.pathsUsingLink.length - 15} more paths
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficFlowModal;
