import React, { useState, useMemo } from 'react';
import { X, HardDrive, AlertTriangle, TrendingUp, ArrowUpDown, Filter, Download, Gauge, Zap, Play, BarChart3, Activity } from 'lucide-react';
import { NetworkData, NetworkLink, NetworkNode } from '../types';
import { COUNTRY_COLORS } from '../constants';

interface CapacityPlanningModalProps {
  data: NetworkData;
  onClose: () => void;
}

type UtilizationLevel = 'all' | 'critical' | 'high' | 'medium' | 'low';
type SortField = 'utilization' | 'capacity' | 'traffic' | 'source' | 'target';

const CapacityPlanningModal: React.FC<CapacityPlanningModalProps> = ({ data, onClose }) => {
  const [utilizationFilter, setUtilizationFilter] = useState<UtilizationLevel>('all');
  const [sortField, setSortField] = useState<SortField>('utilization');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedLink, setSelectedLink] = useState<number | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [trafficGrowthPercent, setTrafficGrowthPercent] = useState(20);
  const [simulatedFailedLinks, setSimulatedFailedLinks] = useState<number[]>([]);

  // Helper to get node ID
  const getNodeId = (node: string | NetworkNode): string => {
    return typeof node === 'string' ? node : node.id;
  };

  // Helper to get node country
  const getNodeCountry = (nodeId: string): string => {
    const node = data.nodes.find(n => n.id === nodeId);
    return node?.country || 'Unknown';
  };

  // Calculate link metrics
  const linkMetrics = useMemo(() => {
    return data.links.map((link, index) => {
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      const sourceCountry = getNodeCountry(sourceId);
      const targetCountry = getNodeCountry(targetId);

      // Get capacity (default to 10G if not specified)
      const sourceCapacity = link.source_capacity?.total_capacity_mbps || 10000;
      const targetCapacity = link.target_capacity?.total_capacity_mbps || 10000;
      const capacity = Math.min(sourceCapacity, targetCapacity);

      // Get traffic data (default to 0 if not specified)
      const forwardTraffic = link.traffic?.forward_traffic_mbps || 0;
      const reverseTraffic = link.traffic?.reverse_traffic_mbps || 0;
      const forwardUtil = link.traffic?.forward_utilization_pct || (capacity > 0 ? (forwardTraffic / capacity) * 100 : 0);
      const reverseUtil = link.traffic?.reverse_utilization_pct || (capacity > 0 ? (reverseTraffic / capacity) * 100 : 0);
      const maxUtil = Math.max(forwardUtil, reverseUtil);

      // Determine utilization level
      let level: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (maxUtil >= 90) level = 'critical';
      else if (maxUtil >= 70) level = 'high';
      else if (maxUtil >= 40) level = 'medium';

      // Format capacity display
      const formatCapacity = (mbps: number): string => {
        if (mbps >= 1000000) return `${(mbps / 1000000).toFixed(0)}T`;
        if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)}G`;
        return `${mbps}M`;
      };

      return {
        index,
        link,
        sourceId,
        targetId,
        sourceCountry,
        targetCountry,
        capacity,
        capacityDisplay: formatCapacity(capacity),
        forwardTraffic,
        reverseTraffic,
        forwardUtil,
        reverseUtil,
        maxUtil,
        level,
        isBundle: link.source_capacity?.is_bundle || false,
        memberCount: link.source_capacity?.member_count || 1,
        speed: link.source_capacity?.speed || '10G',
        isDown: link.status === 'down'
      };
    });
  }, [data]);

  // Filter and sort
  const filteredLinks = useMemo(() => {
    let result = linkMetrics.filter(m => {
      if (utilizationFilter === 'all') return true;
      return m.level === utilizationFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'utilization':
          cmp = a.maxUtil - b.maxUtil;
          break;
        case 'capacity':
          cmp = a.capacity - b.capacity;
          break;
        case 'traffic':
          cmp = (a.forwardTraffic + a.reverseTraffic) - (b.forwardTraffic + b.reverseTraffic);
          break;
        case 'source':
          cmp = a.sourceId.localeCompare(b.sourceId);
          break;
        case 'target':
          cmp = a.targetId.localeCompare(b.targetId);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [linkMetrics, utilizationFilter, sortField, sortAsc]);

  // Summary stats
  const stats = useMemo(() => {
    const critical = linkMetrics.filter(m => m.level === 'critical' && !m.isDown).length;
    const high = linkMetrics.filter(m => m.level === 'high' && !m.isDown).length;
    const medium = linkMetrics.filter(m => m.level === 'medium' && !m.isDown).length;
    const low = linkMetrics.filter(m => m.level === 'low' && !m.isDown).length;
    const down = linkMetrics.filter(m => m.isDown).length;
    const totalCapacity = linkMetrics.reduce((sum, m) => sum + (m.isDown ? 0 : m.capacity), 0);
    const totalTraffic = linkMetrics.reduce((sum, m) => sum + m.forwardTraffic + m.reverseTraffic, 0);
    const avgUtil = linkMetrics.filter(m => !m.isDown).length > 0
      ? linkMetrics.filter(m => !m.isDown).reduce((sum, m) => sum + m.maxUtil, 0) / linkMetrics.filter(m => !m.isDown).length
      : 0;

    return { critical, high, medium, low, down, totalCapacity, totalTraffic, avgUtil };
  }, [linkMetrics]);

  // Traffic simulation calculations
  const simulationResults = useMemo(() => {
    if (!showSimulation) return null;

    const growthMultiplier = 1 + (trafficGrowthPercent / 100);

    const simulatedMetrics = linkMetrics.map(m => {
      const isSimulatedDown = simulatedFailedLinks.includes(m.index) || m.isDown;
      const simForwardTraffic = m.forwardTraffic * growthMultiplier;
      const simReverseTraffic = m.reverseTraffic * growthMultiplier;
      const simForwardUtil = isSimulatedDown ? 0 : (m.capacity > 0 ? (simForwardTraffic / m.capacity) * 100 : 0);
      const simReverseUtil = isSimulatedDown ? 0 : (m.capacity > 0 ? (simReverseTraffic / m.capacity) * 100 : 0);
      const simMaxUtil = Math.max(simForwardUtil, simReverseUtil);

      let simLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (simMaxUtil >= 90) simLevel = 'critical';
      else if (simMaxUtil >= 70) simLevel = 'high';
      else if (simMaxUtil >= 40) simLevel = 'medium';

      const wouldExceedCapacity = simMaxUtil > 100;
      const upgradeNeeded = simMaxUtil >= 80;
      const currentLevel = m.level;
      const levelChange = simLevel !== currentLevel ? (
        (simLevel === 'critical' && currentLevel !== 'critical') ? 'degraded' :
        (simLevel === 'high' && (currentLevel === 'low' || currentLevel === 'medium')) ? 'degraded' :
        (simLevel === 'low' && currentLevel !== 'low') ? 'improved' :
        'unchanged'
      ) : 'unchanged';

      return {
        ...m,
        simForwardTraffic,
        simReverseTraffic,
        simForwardUtil,
        simReverseUtil,
        simMaxUtil,
        simLevel,
        wouldExceedCapacity,
        upgradeNeeded,
        levelChange,
        isSimulatedDown
      };
    });

    const newCritical = simulatedMetrics.filter(m => m.simLevel === 'critical' && !m.isSimulatedDown).length;
    const newHigh = simulatedMetrics.filter(m => m.simLevel === 'high' && !m.isSimulatedDown).length;
    const degradedLinks = simulatedMetrics.filter(m => m.levelChange === 'degraded').length;
    const exceededCapacity = simulatedMetrics.filter(m => m.wouldExceedCapacity && !m.isSimulatedDown).length;
    const upgradesNeeded = simulatedMetrics.filter(m => m.upgradeNeeded && !m.isSimulatedDown).length;

    // Calculate capacity recommendations
    const recommendations = simulatedMetrics
      .filter(m => m.upgradeNeeded && !m.isSimulatedDown)
      .map(m => {
        const targetUtil = 60; // Target 60% utilization after upgrade
        const neededCapacity = Math.max(m.simForwardTraffic, m.simReverseTraffic) / (targetUtil / 100);
        const upgradeAmount = neededCapacity - m.capacity;
        const upgradeMultiplier = Math.ceil(neededCapacity / m.capacity);
        return {
          ...m,
          neededCapacity,
          upgradeAmount,
          upgradeMultiplier,
          suggestedUpgrade: upgradeMultiplier <= 2 ? `Upgrade to ${upgradeMultiplier}x capacity` : 'Major upgrade needed'
        };
      })
      .sort((a, b) => b.simMaxUtil - a.simMaxUtil);

    return {
      simulatedMetrics,
      newCritical,
      newHigh,
      degradedLinks,
      exceededCapacity,
      upgradesNeeded,
      recommendations,
      originalCritical: stats.critical,
      criticalIncrease: newCritical - stats.critical
    };
  }, [showSimulation, trafficGrowthPercent, simulatedFailedLinks, linkMetrics, stats]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getUtilColor = (util: number, isDown: boolean): string => {
    if (isDown) return 'text-gray-500';
    if (util >= 90) return 'text-red-400';
    if (util >= 70) return 'text-orange-400';
    if (util >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUtilBg = (util: number, isDown: boolean): string => {
    if (isDown) return 'bg-gray-700';
    if (util >= 90) return 'bg-red-500';
    if (util >= 70) return 'bg-orange-500';
    if (util >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTraffic = (mbps: number): string => {
    if (mbps >= 1000000) return `${(mbps / 1000000).toFixed(1)}T`;
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)}G`;
    return `${mbps.toFixed(0)}M`;
  };

  const exportCSV = () => {
    const headers = ['Source', 'Target', 'Interface', 'Capacity', 'Forward Traffic', 'Forward Util%', 'Reverse Traffic', 'Reverse Util%', 'Max Util%', 'Status'];
    const rows = filteredLinks.map(m => [
      m.sourceId,
      m.targetId,
      m.link.source_interface,
      m.capacityDisplay,
      formatTraffic(m.forwardTraffic),
      m.forwardUtil.toFixed(1),
      formatTraffic(m.reverseTraffic),
      m.reverseUtil.toFixed(1),
      m.maxUtil.toFixed(1),
      m.isDown ? 'DOWN' : 'UP'
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacity_report.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <HardDrive className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Capacity Planning Dashboard</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Interface capacity and traffic utilization overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSimulation(!showSimulation)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                showSimulation
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {showSimulation ? 'Hide Simulation' : 'Traffic Simulation'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">{stats.critical}</div>
            <div className="text-xs text-red-600 dark:text-red-300">Critical (&gt;90%)</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">{stats.high}</div>
            <div className="text-xs text-orange-600 dark:text-orange-300">High (70-90%)</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{stats.medium}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-300">Medium (40-70%)</div>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">{stats.low}</div>
            <div className="text-xs text-green-600 dark:text-green-300">Low (&lt;40%)</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.down}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Down</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-500 dark:text-blue-400">{formatTraffic(stats.totalCapacity)}</div>
            <div className="text-xs text-blue-600 dark:text-blue-300">Total Capacity</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-500 dark:text-purple-400">{formatTraffic(stats.totalTraffic)}</div>
            <div className="text-xs text-purple-600 dark:text-purple-300">Total Traffic</div>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.avgUtil.toFixed(1)}%</div>
            <div className="text-xs text-cyan-700 dark:text-cyan-300">Avg Utilization</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Filter:</span>
          </div>
          <div className="flex gap-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as UtilizationLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setUtilizationFilter(level)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${utilizationFilter === level
                    ? level === 'critical' ? 'bg-red-500 text-white'
                      : level === 'high' ? 'bg-orange-500 text-white'
                        : level === 'medium' ? 'bg-yellow-500 text-black'
                          : level === 'low' ? 'bg-green-500 text-white'
                            : 'bg-gray-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 ml-auto">
            {filteredLinks.length} of {linkMetrics.length} links
          </div>
        </div>

        {/* Traffic Simulation Panel */}
        {showSimulation && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-900/10">
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Traffic Growth Simulation</span>
              </div>

              {/* Traffic Growth Slider */}
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <span className="text-xs text-gray-500">Growth:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={trafficGrowthPercent}
                  onChange={(e) => setTrafficGrowthPercent(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 w-12">+{trafficGrowthPercent}%</span>
              </div>

              {/* Link Failure Simulation */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Simulate Link Failures:</span>
                <span className="text-sm font-medium text-red-500">{simulatedFailedLinks.length}</span>
                {simulatedFailedLinks.length > 0 && (
                  <button
                    onClick={() => setSimulatedFailedLinks([])}
                    className="text-xs text-red-500 hover:text-red-400 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Simulation Results */}
            {simulationResults && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className={`p-3 rounded-lg border ${
                  simulationResults.criticalIncrease > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-500">{simulationResults.newCritical}</span>
                    {simulationResults.criticalIncrease > 0 && (
                      <span className="text-xs text-red-400">+{simulationResults.criticalIncrease}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Critical Links</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/30 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{simulationResults.newHigh}</div>
                  <div className="text-xs text-gray-500">High Utilization</div>
                </div>
                <div className={`p-3 rounded-lg border ${
                  simulationResults.exceededCapacity > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-1">
                    <span className={`text-2xl font-bold ${simulationResults.exceededCapacity > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {simulationResults.exceededCapacity}
                    </span>
                    {simulationResults.exceededCapacity > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="text-xs text-gray-500">Over Capacity</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-500/30 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{simulationResults.degradedLinks}</div>
                  <div className="text-xs text-gray-500">Degraded Links</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{simulationResults.upgradesNeeded}</div>
                  <div className="text-xs text-gray-500">Upgrades Needed</div>
                </div>
              </div>
            )}

            {/* Capacity Recommendations */}
            {simulationResults && simulationResults.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Upgrade Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {simulationResults.recommendations.slice(0, 6).map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[rec.sourceCountry] || COUNTRY_COLORS.DEFAULT }}
                        />
                        <span className="text-gray-700 dark:text-gray-200">{rec.sourceId}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-700 dark:text-gray-200">{rec.targetId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${rec.simMaxUtil > 100 ? 'text-red-500' : 'text-orange-500'}`}>
                          {rec.simMaxUtil.toFixed(0)}%
                        </span>
                        <span className="text-blue-500">{rec.suggestedUpgrade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="mt-3 text-xs text-gray-500 italic">
              Tip: Click on table rows to simulate link failures. Adjust the growth slider to forecast capacity needs.
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th
                  className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('source')}
                >
                  <div className="flex items-center gap-1">
                    Source
                    {sortField === 'source' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('target')}
                >
                  <div className="flex items-center gap-1">
                    Target
                    {sortField === 'target' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Interface</th>
                <th
                  className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('capacity')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Capacity
                    {sortField === 'capacity' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('traffic')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Traffic (Fwd/Rev)
                    {sortField === 'traffic' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('utilization')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Utilization
                    {sortField === 'utilization' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map(m => (
                <tr
                  key={m.index}
                  className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                    selectedLink === m.index ? 'bg-gray-100 dark:bg-gray-800' : ''
                  } ${
                    showSimulation && simulatedFailedLinks.includes(m.index) ? 'bg-red-50 dark:bg-red-900/20 opacity-60' : ''
                  }`}
                  onClick={() => {
                    if (showSimulation) {
                      // Toggle link failure simulation
                      setSimulatedFailedLinks(prev =>
                        prev.includes(m.index)
                          ? prev.filter(i => i !== m.index)
                          : [...prev, m.index]
                      );
                    } else {
                      setSelectedLink(selectedLink === m.index ? null : m.index);
                    }
                  }}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COUNTRY_COLORS[m.sourceCountry] || COUNTRY_COLORS.DEFAULT }}
                      />
                      <span className="text-gray-700 dark:text-gray-200">{m.sourceId}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COUNTRY_COLORS[m.targetCountry] || COUNTRY_COLORS.DEFAULT }}
                      />
                      <span className="text-gray-700 dark:text-gray-200">{m.targetId}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-300">{m.link.source_interface}</div>
                    {m.isBundle && (
                      <div className="text-[10px] text-blue-500 dark:text-blue-400">
                        Bundle ({m.memberCount}x {m.link.source_capacity?.member_speed || m.speed})
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{m.capacityDisplay}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="text-xs">
                      <span className={getUtilColor(m.forwardUtil, m.isDown)}>{formatTraffic(m.forwardTraffic)}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className={getUtilColor(m.reverseUtil, m.isDown)}>{formatTraffic(m.reverseTraffic)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 w-full max-w-[120px]">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getUtilBg(m.maxUtil, m.isDown)} transition-all`}
                            style={{ width: `${Math.min(m.maxUtil, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getUtilColor(m.maxUtil, m.isDown)}`}>
                          {m.isDown ? '-' : `${m.maxUtil.toFixed(0)}%`}
                        </span>
                      </div>
                      {m.maxUtil >= 90 && !m.isDown && (
                        <div className="flex items-center gap-1 text-[10px] text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          Critical
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${m.isDown ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                      {m.isDown ? 'DOWN' : 'UP'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Link Details */}
        {selectedLink !== null && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            {(() => {
              const m = linkMetrics.find(l => l.index === selectedLink);
              if (!m) return null;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Source Interface</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">{m.link.source_interface}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.link.source_capacity?.speed || '10G'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Target Interface</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">{m.link.target_interface}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.link.target_capacity?.speed || '10G'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Forward Utilization</div>
                    <div className={`text-lg font-bold ${getUtilColor(m.forwardUtil, m.isDown)}`}>
                      {m.forwardUtil.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatTraffic(m.forwardTraffic)} / {m.capacityDisplay}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Reverse Utilization</div>
                    <div className={`text-lg font-bold ${getUtilColor(m.reverseUtil, m.isDown)}`}>
                      {m.reverseUtil.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatTraffic(m.reverseTraffic)} / {m.capacityDisplay}</div>
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

export default CapacityPlanningModal;
