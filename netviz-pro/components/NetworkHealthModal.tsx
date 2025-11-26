import React, { useMemo } from 'react';
import { NetworkData, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Activity, AlertTriangle, CheckCircle, AlertCircle, Lightbulb, Network, Link2, Globe, TrendingUp, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface NetworkHealthModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface HealthMetrics {
  nodeCount: number;
  linkCount: number;
  avgPathCost: number;
  redundancyScore: number;
  singlePointsOfFailure: number;
  asymmetricLinkCount: number;
  activeLinks: number;
  downLinks: number;
  avgLinksPerNode: number;
  countryCount: number;
}

interface Bottleneck {
  type: 'link' | 'node' | 'country';
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  pathsAffected: number;
}

interface Recommendation {
  priority: number;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

const NetworkHealthModal: React.FC<NetworkHealthModalProps> = ({ data, onClose }) => {

  // Calculate all health metrics
  const healthAnalysis = useMemo(() => {
    const countries = Array.from(new Set(data.nodes.map(n => n.country)));

    // Calculate all paths between country pairs for analysis
    const allPaths: PathResult[] = [];
    const linkUsage = new Map<number, number>();
    const nodeUsage = new Map<string, number>();

    countries.forEach(srcCountry => {
      const sourceNodes = data.nodes.filter(n => n.country === srcCountry);
      countries.forEach(destCountry => {
        if (srcCountry === destCountry) return;
        const destNodes = data.nodes.filter(n => n.country === destCountry);

        sourceNodes.forEach(sNode => {
          destNodes.forEach(dNode => {
            const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 3);
            allPaths.push(...paths);

            // Track usage
            paths.forEach(path => {
              path.nodes.forEach(nodeId => {
                nodeUsage.set(nodeId, (nodeUsage.get(nodeId) || 0) + 1);
              });
              for (let i = 0; i < path.nodes.length - 1; i++) {
                const linkIdx = data.links.findIndex(l => {
                  const s = typeof l.source === 'object' ? l.source.id : l.source;
                  const t = typeof l.target === 'object' ? l.target.id : l.target;
                  return (s === path.nodes[i] && t === path.nodes[i + 1]) ||
                         (s === path.nodes[i + 1] && t === path.nodes[i]);
                });
                if (linkIdx !== -1) {
                  linkUsage.set(linkIdx, (linkUsage.get(linkIdx) || 0) + 1);
                }
              }
            });
          });
        });
      });
    });

    // Metrics
    const activeLinks = data.links.filter(l => l.status === 'up').length;
    const downLinks = data.links.length - activeLinks;
    const asymmetricLinks = data.links.filter(l => {
      const fwd = l.forward_cost ?? l.cost;
      const rev = l.reverse_cost ?? fwd;
      return fwd !== rev;
    }).length;

    const avgPathCost = allPaths.length > 0
      ? allPaths.reduce((sum, p) => sum + p.totalCost, 0) / allPaths.length
      : 0;

    // Find single points of failure
    const spofLinks: number[] = [];
    data.links.forEach((_, idx) => {
      // Check if removing this link disconnects any country pair
      const linksWithout = data.links.map((l, i) => i === idx ? { ...l, status: 'down' } : l);
      let isSpof = false;

      for (const srcCountry of countries) {
        if (isSpof) break;
        for (const destCountry of countries) {
          if (srcCountry === destCountry) continue;
          const srcNode = data.nodes.find(n => n.country === srcCountry);
          const destNode = data.nodes.find(n => n.country === destCountry);
          if (srcNode && destNode) {
            const pathsBefore = findAllPaths(data.nodes, data.links, srcNode.id, destNode.id, 1);
            const pathsAfter = findAllPaths(data.nodes, linksWithout, srcNode.id, destNode.id, 1);
            if (pathsBefore.length > 0 && pathsAfter.length === 0) {
              isSpof = true;
              break;
            }
          }
        }
      }
      if (isSpof) spofLinks.push(idx);
    });

    // Calculate redundancy score (0-100)
    // Based on: average paths per country pair, SPOF count, link diversity
    const avgPathsPerPair = allPaths.length / Math.max(1, countries.length * (countries.length - 1));
    const spofPenalty = spofLinks.length * 10;
    const redundancyScore = Math.max(0, Math.min(100,
      Math.round(
        (avgPathsPerPair > 3 ? 40 : avgPathsPerPair * 13) +
        (activeLinks > data.nodes.length ? 30 : (activeLinks / data.nodes.length) * 30) +
        30 - spofPenalty
      )
    ));

    const metrics: HealthMetrics = {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      avgPathCost: Math.round(avgPathCost),
      redundancyScore,
      singlePointsOfFailure: spofLinks.length,
      asymmetricLinkCount: asymmetricLinks,
      activeLinks,
      downLinks,
      avgLinksPerNode: data.nodes.length > 0 ? (data.links.length * 2) / data.nodes.length : 0,
      countryCount: countries.length
    };

    // Identify bottlenecks
    const bottlenecks: Bottleneck[] = [];

    // Link bottlenecks (high usage)
    const maxLinkUsage = Math.max(...Array.from(linkUsage.values()), 1);
    linkUsage.forEach((usage, linkIdx) => {
      const usagePercent = (usage / maxLinkUsage) * 100;
      if (usagePercent >= 70) {
        const link = data.links[linkIdx];
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        bottlenecks.push({
          type: 'link',
          id: `${srcId} ↔ ${tgtId}`,
          severity: usagePercent >= 90 ? 'critical' : usagePercent >= 80 ? 'high' : 'medium',
          description: `High traffic concentration (${usage} paths)`,
          pathsAffected: usage
        });
      }
    });

    // Node bottlenecks
    const maxNodeUsage = Math.max(...Array.from(nodeUsage.values()), 1);
    nodeUsage.forEach((usage, nodeId) => {
      const usagePercent = (usage / maxNodeUsage) * 100;
      if (usagePercent >= 80) {
        const node = data.nodes.find(n => n.id === nodeId);
        bottlenecks.push({
          type: 'node',
          id: nodeId,
          severity: usagePercent >= 95 ? 'critical' : 'high',
          description: `Critical transit node in ${node?.country || 'Unknown'}`,
          pathsAffected: usage
        });
      }
    });

    // Country bottlenecks (transit)
    const countryTransit = new Map<string, number>();
    allPaths.forEach(path => {
      const srcNode = data.nodes.find(n => n.id === path.nodes[0]);
      const dstNode = data.nodes.find(n => n.id === path.nodes[path.nodes.length - 1]);
      if (!srcNode || !dstNode) return;

      path.nodes.slice(1, -1).forEach(nodeId => {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node && node.country !== srcNode.country && node.country !== dstNode.country) {
          countryTransit.set(node.country, (countryTransit.get(node.country) || 0) + 1);
        }
      });
    });

    const maxCountryTransit = Math.max(...Array.from(countryTransit.values()), 1);
    countryTransit.forEach((transit, country) => {
      const transitPercent = (transit / maxCountryTransit) * 100;
      if (transitPercent >= 60) {
        bottlenecks.push({
          type: 'country',
          id: country,
          severity: transitPercent >= 90 ? 'critical' : transitPercent >= 75 ? 'high' : 'medium',
          description: `Heavy transit hub (${transit} paths through)`,
          pathsAffected: transit
        });
      }
    });

    bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    if (spofLinks.length > 0) {
      recommendations.push({
        priority: 1,
        title: 'Address Single Points of Failure',
        description: `${spofLinks.length} link(s) are single points of failure. Add redundant paths to improve resilience.`,
        impact: 'Critical for network reliability',
        effort: 'high'
      });
    }

    if (downLinks > 0) {
      recommendations.push({
        priority: 2,
        title: 'Restore Down Links',
        description: `${downLinks} link(s) are currently down. Restore them to improve connectivity.`,
        impact: 'May be affecting path availability',
        effort: 'medium'
      });
    }

    if (asymmetricLinks > 0) {
      recommendations.push({
        priority: 3,
        title: 'Review Asymmetric Routing',
        description: `${asymmetricLinks} link(s) have asymmetric costs. Verify this is intentional.`,
        impact: 'May cause unexpected traffic patterns',
        effort: 'low'
      });
    }

    const lowConnectivityNodes = data.nodes.filter(n => {
      const connections = data.links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return s === n.id || t === n.id;
      }).length;
      return connections < 2;
    });

    if (lowConnectivityNodes.length > 0) {
      recommendations.push({
        priority: 4,
        title: 'Improve Node Connectivity',
        description: `${lowConnectivityNodes.length} node(s) have only 1 connection. Consider adding backup links.`,
        impact: 'Single-homed nodes are vulnerable',
        effort: 'medium'
      });
    }

    if (redundancyScore < 50) {
      recommendations.push({
        priority: 5,
        title: 'Increase Network Redundancy',
        description: 'Overall redundancy score is low. Add more diverse paths between major locations.',
        impact: 'Network is vulnerable to failures',
        effort: 'high'
      });
    }

    // Calculate overall health score
    let healthScore = 100;
    healthScore -= spofLinks.length * 15;
    healthScore -= downLinks * 5;
    healthScore -= Math.min(30, bottlenecks.filter(b => b.severity === 'critical').length * 10);
    healthScore += redundancyScore / 5;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
      metrics,
      bottlenecks: bottlenecks.slice(0, 10),
      recommendations: recommendations.slice(0, 5),
      healthScore,
      spofLinks
    };
  }, [data]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleExport = () => {
    // Export bottlenecks
    const exportData = healthAnalysis.bottlenecks.map(b => ({
      type: b.type,
      item: b.id,
      severity: b.severity,
      description: b.description,
      pathsAffected: b.pathsAffected,
    }));

    // Add metrics as first rows
    const metricsRow = {
      type: 'METRICS',
      item: `Score: ${healthAnalysis.healthScore}`,
      severity: 'N/A',
      description: `Nodes: ${healthAnalysis.metrics.nodeCount}, Links: ${healthAnalysis.metrics.linkCount}, Asymmetric: ${healthAnalysis.metrics.asymmetricLinkCount}`,
      pathsAffected: healthAnalysis.metrics.singlePointsOfFailure,
    };

    const columns: ExportColumn[] = [
      { header: 'Type', key: 'type' },
      { header: 'Item', key: 'item' },
      { header: 'Severity', key: 'severity' },
      { header: 'Description', key: 'description' },
      { header: 'Paths Affected / SPOF Count', key: 'pathsAffected' },
    ];

    exportToCSV([metricsRow, ...exportData], columns, 'network_health');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-rose-400" />
              Network Health Dashboard
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Overall network health metrics, bottlenecks, and recommendations
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Health Score */}
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getHealthColor(healthAnalysis.healthScore)}`}>
                {healthAnalysis.healthScore}
              </div>
              <div className="text-lg text-gray-400 mt-1">Health Score</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {healthAnalysis.healthScore >= 80 ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : healthAnalysis.healthScore >= 50 ? (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm ${getHealthColor(healthAnalysis.healthScore)}`}>
                  {healthAnalysis.healthScore >= 80 ? 'Healthy' :
                   healthAnalysis.healthScore >= 60 ? 'Fair' :
                   healthAnalysis.healthScore >= 40 ? 'Needs Attention' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Network className="w-3 h-3" />
                Nodes
              </div>
              <div className="text-xl font-bold text-white">{healthAnalysis.metrics.nodeCount}</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Link2 className="w-3 h-3" />
                Links
              </div>
              <div className="text-xl font-bold text-white">{healthAnalysis.metrics.linkCount}</div>
              <div className="text-xs text-gray-500">{healthAnalysis.metrics.activeLinks} up / {healthAnalysis.metrics.downLinks} down</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Globe className="w-3 h-3" />
                Countries
              </div>
              <div className="text-xl font-bold text-white">{healthAnalysis.metrics.countryCount}</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Avg Path Cost
              </div>
              <div className="text-xl font-bold text-white">{healthAnalysis.metrics.avgPathCost}</div>
            </div>
            <div className={`border rounded-lg p-3 ${
              healthAnalysis.metrics.singlePointsOfFailure > 0
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-gray-800/50 border-gray-700'
            }`}>
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <AlertTriangle className="w-3 h-3" />
                SPOF Links
              </div>
              <div className={`text-xl font-bold ${
                healthAnalysis.metrics.singlePointsOfFailure > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {healthAnalysis.metrics.singlePointsOfFailure}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Activity className="w-3 h-3" />
                Redundancy
              </div>
              <div className={`text-xl font-bold ${getHealthColor(healthAnalysis.metrics.redundancyScore)}`}>
                {healthAnalysis.metrics.redundancyScore}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottlenecks */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Bottlenecks Detected
              </h3>
              {healthAnalysis.bottlenecks.length === 0 ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-2" />
                  <p className="text-green-300">No significant bottlenecks detected</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {healthAnalysis.bottlenecks.map((bottleneck, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 ${getSeverityColor(bottleneck.severity)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-black/20">
                            {bottleneck.type}
                          </span>
                          <span className="font-medium">{bottleneck.id}</span>
                        </div>
                        <span className="text-xs uppercase">{bottleneck.severity}</span>
                      </div>
                      <p className="text-sm opacity-80">{bottleneck.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-lime-400" />
                Recommendations
              </h3>
              {healthAnalysis.recommendations.length === 0 ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-2" />
                  <p className="text-green-300">Network is well optimized</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {healthAnalysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{rec.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          rec.effort === 'low' ? 'bg-green-900/50 text-green-300' :
                          rec.effort === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {rec.effort} effort
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{rec.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{rec.impact}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Asymmetric Links Warning */}
          {healthAnalysis.metrics.asymmetricLinkCount > 0 && (
            <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Asymmetric Routing Detected</span>
              </div>
              <p className="text-sm text-yellow-200/80">
                {healthAnalysis.metrics.asymmetricLinkCount} link(s) have different forward and reverse costs.
                This can cause different paths for traffic in each direction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkHealthModal;
