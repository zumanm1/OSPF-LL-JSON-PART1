import React, { useState, useMemo } from 'react';
import { X, BarChart3, Upload, Clock, ArrowRight, AlertCircle, Download } from 'lucide-react';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';
import { NetworkData, NetworkNode, TrafficSnapshot, TrafficData } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { COUNTRY_COLORS } from '../constants';

interface TrafficUtilizationMatrixProps {
  data: NetworkData;
  onClose: () => void;
}

interface RouteTraffic {
  sourceCountry: string;
  destCountry: string;
  paths: {
    nodeIds: string[];
    linkIndices: number[];
    totalCost: number;
  }[];
  totalTraffic: number;
  avgUtilization: number;
  maxLinkUtil: number;
  bottleneckLink: number | null;
}

const TrafficUtilizationMatrix: React.FC<TrafficUtilizationMatrixProps> = ({ data, onClose }) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>(data.current_snapshot_id || 'current');
  const [selectedPair, setSelectedPair] = useState<{ source: string; dest: string } | null>(null);
  const [uploadedSnapshot, setUploadedSnapshot] = useState<TrafficSnapshot | null>(null);

  // Get node ID helper
  const getNodeId = (node: string | NetworkNode): string => {
    return typeof node === 'string' ? node : node.id;
  };

  // Get countries
  const countries = useMemo(() => {
    const countrySet = new Set(data.nodes.map(n => n.country));
    return Array.from(countrySet).sort();
  }, [data]);

  // Get current traffic data based on selected snapshot
  const currentTrafficData = useMemo(() => {
    if (selectedSnapshot === 'current') {
      // Use embedded traffic in links
      return null;
    }

    if (selectedSnapshot === 'uploaded' && uploadedSnapshot) {
      return uploadedSnapshot.link_traffic;
    }

    const snapshot = data.traffic_snapshots?.find(s => s.snapshot_id === selectedSnapshot);
    return snapshot?.link_traffic || null;
  }, [selectedSnapshot, data.traffic_snapshots, uploadedSnapshot]);

  // Get link traffic (from snapshot or embedded)
  const getLinkTraffic = (linkIndex: number): TrafficData | undefined => {
    if (currentTrafficData && currentTrafficData[linkIndex]) {
      return currentTrafficData[linkIndex];
    }
    return data.links[linkIndex]?.traffic;
  };

  // Calculate country-to-country traffic matrix
  const trafficMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, RouteTraffic>> = {};

    // Initialize matrix
    countries.forEach(src => {
      matrix[src] = {};
      countries.forEach(dst => {
        if (src !== dst) {
          matrix[src][dst] = {
            sourceCountry: src,
            destCountry: dst,
            paths: [],
            totalTraffic: 0,
            avgUtilization: 0,
            maxLinkUtil: 0,
            bottleneckLink: null
          };
        }
      });
    });

    // Get all shortest paths between countries
    countries.forEach(srcCountry => {
      const srcNodes = data.nodes.filter(n => n.country === srcCountry);

      srcNodes.forEach(srcNode => {
        // Calculate paths from this source
        countries.forEach(dstCountry => {
          if (srcCountry === dstCountry) return;

          const dstNodes = data.nodes.filter(n => n.country === dstCountry);

          dstNodes.forEach(dstNode => {
            const paths = findAllPaths(data.nodes, data.links, srcNode.id, dstNode.id);
            if (paths.length > 0) {
              const bestPath = paths[0];

              // Calculate traffic and utilization along path
              let pathTraffic = 0;
              let maxUtil = 0;
              let bottleneck: number | null = null;
              const linkIndices: number[] = [];

              // Find link indices in path
              for (let i = 0; i < bestPath.nodes.length - 1; i++) {
                const from = bestPath.nodes[i];
                const to = bestPath.nodes[i + 1];

                const linkIdx = data.links.findIndex(l => {
                  const srcId = getNodeId(l.source);
                  const tgtId = getNodeId(l.target);
                  return (srcId === from && tgtId === to) || (srcId === to && tgtId === from);
                });

                if (linkIdx >= 0) {
                  linkIndices.push(linkIdx);
                  const traffic = getLinkTraffic(linkIdx);
                  if (traffic) {
                    const util = Math.max(traffic.forward_utilization_pct, traffic.reverse_utilization_pct);
                    if (util > maxUtil) {
                      maxUtil = util;
                      bottleneck = linkIdx;
                    }
                    pathTraffic += traffic.forward_traffic_mbps + traffic.reverse_traffic_mbps;
                  }
                }
              }

              if (linkIndices.length > 0) {
                matrix[srcCountry][dstCountry].paths.push({
                  nodeIds: bestPath.nodes,
                  linkIndices,
                  totalCost: bestPath.totalCost
                });
                matrix[srcCountry][dstCountry].totalTraffic += pathTraffic / linkIndices.length;
                if (maxUtil > matrix[srcCountry][dstCountry].maxLinkUtil) {
                  matrix[srcCountry][dstCountry].maxLinkUtil = maxUtil;
                  matrix[srcCountry][dstCountry].bottleneckLink = bottleneck;
                }
              }
            }
          });
        });
      });
    });

    // Calculate average utilization
    Object.values(matrix).forEach(row => {
      Object.values(row).forEach(cell => {
        if (cell.paths.length > 0) {
          cell.avgUtilization = cell.maxLinkUtil;
        }
      });
    });

    return matrix;
  }, [data, countries, currentTrafficData]);

  // Handle snapshot file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.link_traffic) {
          setUploadedSnapshot({
            snapshot_id: 'uploaded',
            snapshot_name: file.name,
            timestamp: new Date().toISOString(),
            link_traffic: content.link_traffic
          });
          setSelectedSnapshot('uploaded');
        }
      } catch (err) {
        console.error('Failed to parse traffic snapshot:', err);
      }
    };
    reader.readAsText(file);
  };

  const getUtilColor = (util: number): string => {
    if (util >= 90) return 'bg-red-500';
    if (util >= 70) return 'bg-orange-500';
    if (util >= 40) return 'bg-yellow-500';
    if (util > 0) return 'bg-green-500';
    return 'bg-gray-700';
  };

  const getUtilTextColor = (util: number): string => {
    if (util >= 90) return 'text-red-400';
    if (util >= 70) return 'text-orange-400';
    if (util >= 40) return 'text-yellow-400';
    if (util > 0) return 'text-green-400';
    return 'text-gray-500';
  };

  const formatTraffic = (mbps: number): string => {
    if (mbps >= 1000000) return `${(mbps / 1000000).toFixed(1)}T`;
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)}G`;
    if (mbps > 0) return `${mbps.toFixed(0)}M`;
    return '-';
  };

  // Get available snapshots
  const snapshots = useMemo(() => {
    const list = [{ id: 'current', name: 'Current (Embedded)', timestamp: '' }];
    data.traffic_snapshots?.forEach(s => {
      list.push({ id: s.snapshot_id, name: s.snapshot_name, timestamp: s.timestamp });
    });
    if (uploadedSnapshot) {
      list.push({ id: 'uploaded', name: uploadedSnapshot.snapshot_name, timestamp: uploadedSnapshot.timestamp });
    }
    return list;
  }, [data.traffic_snapshots, uploadedSnapshot]);

  const handleExport = () => {
    const exportData: any[] = [];

    countries.forEach(srcCountry => {
      countries.forEach(dstCountry => {
        if (srcCountry === dstCountry) return;

        const cell = trafficMatrix[srcCountry]?.[dstCountry];
        if (cell) {
          const bottleneckLinkInfo = cell.bottleneckLink !== null
            ? `${getNodeId(data.links[cell.bottleneckLink].source)} → ${getNodeId(data.links[cell.bottleneckLink].target)}`
            : 'None';

          exportData.push({
            sourceCountry: srcCountry,
            destCountry: dstCountry,
            pathCount: cell.paths.length,
            totalTraffic: cell.totalTraffic.toFixed(1),
            maxLinkUtil: `${cell.maxLinkUtil.toFixed(1)}%`,
            avgUtilization: `${cell.avgUtilization.toFixed(1)}%`,
            bottleneckLink: bottleneckLinkInfo,
          });
        }
      });
    });

    const columns: ExportColumn[] = [
      { header: 'Source Country', key: 'sourceCountry' },
      { header: 'Destination Country', key: 'destCountry' },
      { header: 'Path Count', key: 'pathCount' },
      { header: 'Total Traffic (Mbps)', key: 'totalTraffic' },
      { header: 'Max Link Utilization', key: 'maxLinkUtil' },
      { header: 'Avg Utilization', key: 'avgUtilization' },
      { header: 'Bottleneck Link', key: 'bottleneckLink' },
    ];

    exportToCSV(exportData, columns, `traffic_utilization_matrix_${selectedSnapshot}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Traffic Utilization Matrix</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Country-to-country traffic analysis with path utilization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {countries.length > 1 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Snapshot Selector */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Traffic Snapshot:</span>
          </div>
          <select
            value={selectedSnapshot}
            onChange={(e) => setSelectedSnapshot(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200"
          >
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.timestamp && `(${new Date(s.timestamp).toLocaleString()})`}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer text-xs text-gray-700 dark:text-gray-300">
            <Upload className="w-3.5 h-3.5" />
            Upload Snapshot
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300">
          <span className="text-gray-500">Utilization:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> &lt;40%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> 40-70%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> 70-90%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> &gt;90%</span>
        </div>

        {/* Matrix */}
        <div className="flex-1 overflow-auto p-4">
          <div className="inline-block min-w-full">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-gray-500 font-medium sticky left-0 bg-white dark:bg-gray-900">From \ To</th>
                  {countries.map(country => (
                    <th key={country} className="p-2 text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[country] || COUNTRY_COLORS.DEFAULT }}
                        />
                        {country}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countries.map(srcCountry => (
                  <tr key={srcCountry}>
                    <td className="p-2 text-xs text-gray-500 dark:text-gray-400 font-medium sticky left-0 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[srcCountry] || COUNTRY_COLORS.DEFAULT }}
                        />
                        {srcCountry}
                      </div>
                    </td>
                    {countries.map(dstCountry => {
                      if (srcCountry === dstCountry) {
                        return (
                          <td key={dstCountry} className="p-1">
                            <div className="w-16 h-12 bg-gray-100 dark:bg-gray-800/50 rounded flex items-center justify-center">
                              <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                            </div>
                          </td>
                        );
                      }

                      const cell = trafficMatrix[srcCountry]?.[dstCountry];
                      const util = cell?.maxLinkUtil || 0;
                      const hasBottleneck = util >= 70;

                      return (
                        <td key={dstCountry} className="p-1">
                          <button
                            onClick={() => setSelectedPair({ source: srcCountry, dest: dstCountry })}
                            className={`w-16 h-12 rounded flex flex-col items-center justify-center transition-all hover:ring-2 hover:ring-blue-500 ${
                              selectedPair?.source === srcCountry && selectedPair?.dest === dstCountry
                                ? 'ring-2 ring-blue-500'
                                : ''
                            } ${getUtilColor(util)}/20 border border-gray-300 dark:border-gray-700`}
                          >
                            <span className={`text-sm font-bold ${getUtilTextColor(util)}`}>
                              {util > 0 ? `${util.toFixed(0)}%` : '-'}
                            </span>
                            {hasBottleneck && (
                              <AlertCircle className="w-3 h-3 text-orange-400" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Pair Details */}
        {selectedPair && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COUNTRY_COLORS[selectedPair.source] || COUNTRY_COLORS.DEFAULT }}
              />
              <span className="text-gray-900 dark:text-white font-medium">{selectedPair.source}</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COUNTRY_COLORS[selectedPair.dest] || COUNTRY_COLORS.DEFAULT }}
              />
              <span className="text-gray-900 dark:text-white font-medium">{selectedPair.dest}</span>
            </div>

            {(() => {
              const cell = trafficMatrix[selectedPair.source]?.[selectedPair.dest];
              if (!cell || cell.paths.length === 0) {
                return <p className="text-sm text-gray-500">No path available</p>;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Max Link Utilization</div>
                    <div className={`text-2xl font-bold ${getUtilTextColor(cell.maxLinkUtil)}`}>
                      {cell.maxLinkUtil.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Path Count</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{cell.paths.length}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Bottleneck Link</div>
                    {cell.bottleneckLink !== null ? (
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        {getNodeId(data.links[cell.bottleneckLink].source)} →{' '}
                        {getNodeId(data.links[cell.bottleneckLink].target)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">None</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficUtilizationMatrix;
