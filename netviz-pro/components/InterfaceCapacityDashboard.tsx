import React, { useState, useMemo } from 'react';
import { X, Monitor, Activity, Zap, ArrowUpDown, Filter, Download, RefreshCw, ChevronRight, AlertTriangle, CheckCircle, XCircle, Cpu, HardDrive, Network, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react';
import { NetworkData, NetworkNode, NetworkLink } from '../types';
import { COUNTRY_COLORS } from '../constants';

interface InterfaceCapacityDashboardProps {
  data: NetworkData;
  onClose: () => void;
}

type ViewTab = 'summary' | 'interfaces' | 'traffic' | 'router';
type CapacityFilter = 'all' | '1G' | '10G' | 'LAG';
type StatusFilter = 'all' | 'up' | 'down';

interface InterfaceData {
  router: string;
  routerCountry: string;
  interface: string;
  description: string;
  status: 'up/up' | 'down/down' | 'up/down' | 'admin-down';
  capacity: string;
  capacityMbps: number;
  inputRate: number;
  outputRate: number;
  inputUtil: number;
  outputUtil: number;
  neighbor: string;
  neighborCountry: string;
  isLogical: boolean;
  isBundle: boolean;
  bundleMembers?: number;
  memberSpeed?: string;
  linkIndex?: number;
  forwardCost: number;
  reverseCost: number;
  isAsymmetric: boolean;
}

interface CountryFlow {
  sourceCountry: string;
  destCountry: string;
  linkCount: number;
  totalInputRate: number;
  totalOutputRate: number;
  avgInputUtil: number;
  avgOutputUtil: number;
}

const InterfaceCapacityDashboard: React.FC<InterfaceCapacityDashboardProps> = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('summary');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [routerFilter, setRouterFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('router');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRouter, setSelectedRouter] = useState<string | null>(null);

  // Helper to get node by ID
  const getNode = (id: string): NetworkNode | undefined => {
    return data.nodes.find(n => n.id === id);
  };

  const getNodeId = (node: string | NetworkNode): string => {
    return typeof node === 'string' ? node : node.id;
  };

  // Build interface data from links
  const interfaces = useMemo((): InterfaceData[] => {
    const result: InterfaceData[] = [];
    const seenInterfaces = new Set<string>();

    data.links.forEach((link, index) => {
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      const sourceNode = getNode(sourceId);
      const targetNode = getNode(targetId);

      if (!sourceNode || !targetNode) return;

      // Source interface
      const sourceKey = `${sourceId}:${link.source_interface}`;
      if (!seenInterfaces.has(sourceKey)) {
        seenInterfaces.add(sourceKey);
        const isLogical = link.source_interface?.includes('.') || link.source_interface?.includes('logical');
        const isBundle = link.source_capacity?.is_bundle || link.source_interface?.toLowerCase().includes('bundle');

        result.push({
          router: sourceId,
          routerCountry: sourceNode.country,
          interface: link.source_interface || 'Unknown',
          description: `OSPF Area 0 - ${sourceNode.loopback_ip || '0.0.0.0'}/30`,
          status: link.status === 'up' ? 'up/up' : 'down/down',
          capacity: isBundle ? 'LAG' : (link.source_capacity?.speed || '1G'),
          capacityMbps: link.source_capacity?.total_capacity_mbps || 1000,
          inputRate: link.traffic?.reverse_traffic_mbps || 0,
          outputRate: link.traffic?.forward_traffic_mbps || 0,
          inputUtil: link.traffic?.reverse_utilization_pct || 0,
          outputUtil: link.traffic?.forward_utilization_pct || 0,
          neighbor: targetId,
          neighborCountry: targetNode.country,
          isLogical,
          isBundle,
          bundleMembers: link.source_capacity?.member_count,
          memberSpeed: link.source_capacity?.member_speed,
          linkIndex: index,
          forwardCost: link.forward_cost || link.cost || 0,
          reverseCost: link.reverse_cost || link.forward_cost || link.cost || 0,
          isAsymmetric: link.is_asymmetric || false
        });
      }

      // Target interface
      const targetKey = `${targetId}:${link.target_interface}`;
      if (!seenInterfaces.has(targetKey)) {
        seenInterfaces.add(targetKey);
        const isLogical = link.target_interface?.includes('.') || link.target_interface?.includes('logical');
        const isBundle = link.target_capacity?.is_bundle || link.target_interface?.toLowerCase().includes('bundle');

        result.push({
          router: targetId,
          routerCountry: targetNode.country,
          interface: link.target_interface || 'Unknown',
          description: `OSPF Area 0 - ${targetNode.loopback_ip || '0.0.0.0'}/30`,
          status: link.status === 'up' ? 'up/up' : 'down/down',
          capacity: isBundle ? 'LAG' : (link.target_capacity?.speed || '1G'),
          capacityMbps: link.target_capacity?.total_capacity_mbps || 1000,
          inputRate: link.traffic?.forward_traffic_mbps || 0,
          outputRate: link.traffic?.reverse_traffic_mbps || 0,
          inputUtil: link.traffic?.forward_utilization_pct || 0,
          outputUtil: link.traffic?.reverse_utilization_pct || 0,
          neighbor: sourceId,
          neighborCountry: sourceNode.country,
          isLogical,
          isBundle,
          bundleMembers: link.target_capacity?.member_count,
          memberSpeed: link.target_capacity?.member_speed,
          linkIndex: index,
          forwardCost: link.reverse_cost || link.cost || 0,
          reverseCost: link.forward_cost || link.cost || 0,
          isAsymmetric: link.is_asymmetric || false
        });
      }
    });

    // Add loopback interfaces for each router
    data.nodes.forEach(node => {
      result.push({
        router: node.id,
        routerCountry: node.country,
        interface: 'Lo0',
        description: `OSPF Area 0 - ${node.loopback_ip || '172.16.0.0'}/32`,
        status: node.is_active ? 'up/up' : 'down/down',
        capacity: '1G',
        capacityMbps: 1000,
        inputRate: 0,
        outputRate: 0,
        inputUtil: 0,
        outputUtil: 0,
        neighbor: '-',
        neighborCountry: '-',
        isLogical: false,
        isBundle: false,
        forwardCost: 0,
        reverseCost: 0,
        isAsymmetric: false
      });
    });

    return result;
  }, [data]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalInterfaces = interfaces.length;
    const physicalInterfaces = interfaces.filter(i => !i.isLogical && i.interface !== 'Lo0').length;
    const logicalInterfaces = interfaces.filter(i => i.isLogical).length;
    const loopbackInterfaces = interfaces.filter(i => i.interface === 'Lo0').length;
    const highUtilization = interfaces.filter(i => Math.max(i.inputUtil, i.outputUtil) > 50).length;
    const criticalUtilization = interfaces.filter(i => Math.max(i.inputUtil, i.outputUtil) > 90).length;
    const downInterfaces = interfaces.filter(i => i.status !== 'up/up').length;

    const capacity1G = interfaces.filter(i => i.capacity === '1G').length;
    const capacity10G = interfaces.filter(i => i.capacity === '10G').length;
    const capacityLAG = interfaces.filter(i => i.isBundle || i.capacity === 'LAG').length;

    const totalCapacityMbps = interfaces.reduce((sum, i) => sum + (i.interface !== 'Lo0' ? i.capacityMbps : 0), 0);
    const totalInputTraffic = interfaces.reduce((sum, i) => sum + i.inputRate, 0);
    const totalOutputTraffic = interfaces.reduce((sum, i) => sum + i.outputRate, 0);

    const asymmetricLinks = interfaces.filter(i => i.isAsymmetric && i.linkIndex !== undefined).length / 2;

    return {
      totalInterfaces,
      physicalInterfaces,
      logicalInterfaces,
      loopbackInterfaces,
      highUtilization,
      criticalUtilization,
      downInterfaces,
      capacity1G,
      capacity10G,
      capacityLAG,
      totalCapacityMbps,
      totalInputTraffic,
      totalOutputTraffic,
      asymmetricLinks
    };
  }, [interfaces]);

  // Interfaces by router
  const interfacesByRouter = useMemo(() => {
    const byRouter: Record<string, InterfaceData[]> = {};
    interfaces.forEach(i => {
      if (!byRouter[i.router]) byRouter[i.router] = [];
      byRouter[i.router].push(i);
    });
    return Object.entries(byRouter)
      .map(([router, ifs]) => ({
        router,
        country: ifs[0]?.routerCountry || 'Unknown',
        count: ifs.length,
        interfaces: ifs
      }))
      .sort((a, b) => b.count - a.count);
  }, [interfaces]);

  // Country-to-country traffic flow
  const countryFlows = useMemo((): CountryFlow[] => {
    const flowMap: Record<string, CountryFlow> = {};

    interfaces.forEach(i => {
      if (i.neighbor === '-' || i.interface === 'Lo0') return;

      const key = `${i.routerCountry}->${i.neighborCountry}`;
      if (!flowMap[key]) {
        flowMap[key] = {
          sourceCountry: i.routerCountry,
          destCountry: i.neighborCountry,
          linkCount: 0,
          totalInputRate: 0,
          totalOutputRate: 0,
          avgInputUtil: 0,
          avgOutputUtil: 0
        };
      }
      flowMap[key].linkCount++;
      flowMap[key].totalInputRate += i.inputRate;
      flowMap[key].totalOutputRate += i.outputRate;
    });

    return Object.values(flowMap).map(flow => ({
      ...flow,
      avgInputUtil: flow.linkCount > 0 ? flow.totalInputRate / (flow.linkCount * 1000) * 100 : 0,
      avgOutputUtil: flow.linkCount > 0 ? flow.totalOutputRate / (flow.linkCount * 1000) * 100 : 0
    })).sort((a, b) => b.linkCount - a.linkCount);
  }, [interfaces]);

  // Filtered and sorted interfaces
  const filteredInterfaces = useMemo(() => {
    let result = [...interfaces];

    // Apply filters
    if (capacityFilter !== 'all') {
      if (capacityFilter === 'LAG') {
        result = result.filter(i => i.isBundle || i.capacity === 'LAG');
      } else {
        result = result.filter(i => i.capacity === capacityFilter);
      }
    }

    if (statusFilter !== 'all') {
      result = result.filter(i => i.status.startsWith(statusFilter));
    }

    if (routerFilter !== 'all') {
      result = result.filter(i => i.router === routerFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'router':
          cmp = a.router.localeCompare(b.router);
          break;
        case 'interface':
          cmp = a.interface.localeCompare(b.interface);
          break;
        case 'capacity':
          cmp = a.capacityMbps - b.capacityMbps;
          break;
        case 'inputUtil':
          cmp = a.inputUtil - b.inputUtil;
          break;
        case 'outputUtil':
          cmp = a.outputUtil - b.outputUtil;
          break;
        case 'cost':
          cmp = a.forwardCost - b.forwardCost;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [interfaces, capacityFilter, statusFilter, routerFilter, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatRate = (mbps: number): string => {
    if (mbps === 0) return '0 bps';
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
    if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`;
    return `${(mbps * 1000).toFixed(0)} Kbps`;
  };

  const formatCapacity = (mbps: number): string => {
    if (mbps >= 100000) return `${(mbps / 1000000).toFixed(0)}T`;
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)}G`;
    return `${mbps}M`;
  };

  const getUtilColor = (util: number): string => {
    if (util >= 90) return 'text-red-500';
    if (util >= 70) return 'text-orange-500';
    if (util >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUtilBg = (util: number): string => {
    if (util >= 90) return 'bg-red-500';
    if (util >= 70) return 'bg-orange-500';
    if (util >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const exportCSV = () => {
    const headers = ['Router', 'Country', 'Interface', 'Description', 'Status', 'Capacity', 'Input Rate', 'Output Rate', 'In %', 'Out %', 'Neighbor', 'Forward Cost', 'Reverse Cost', 'Asymmetric'];
    const rows = filteredInterfaces.map(i => [
      i.router,
      i.routerCountry,
      i.interface,
      i.description,
      i.status,
      i.capacity,
      formatRate(i.inputRate),
      formatRate(i.outputRate),
      i.inputUtil.toFixed(1),
      i.outputUtil.toFixed(1),
      i.neighbor,
      i.forwardCost,
      i.reverseCost,
      i.isAsymmetric ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interface_capacity_report.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Interface Capacity & Traffic Analysis</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Network traffic analysis and interface capacity monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'summary', label: 'Summary Dashboard', icon: BarChart3 },
            { id: 'interfaces', label: 'Interface Details', icon: HardDrive },
            { id: 'traffic', label: 'Traffic Flow', icon: Activity },
            { id: 'router', label: 'By Router', icon: Cpu }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ViewTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Summary Dashboard */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalInterfaces}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total Interfaces</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.physicalInterfaces}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Physical Interfaces</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.logicalInterfaces}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Logical (Sub-interfaces)</div>
                </div>
                <div className={`border rounded-lg p-4 ${
                  stats.highUtilization > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className={`text-3xl font-bold ${stats.highUtilization > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {stats.highUtilization}
                  </div>
                  <div className={`text-sm ${stats.highUtilization > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-500'}`}>
                    High Utilization (&gt;50%)
                  </div>
                </div>
              </div>

              {/* Interface Capacity Distribution */}
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Interface Capacity Distribution</h3>
                <div className="flex gap-3">
                  <div className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium">
                    1G ({stats.capacity1G})
                  </div>
                  {stats.capacity10G > 0 && (
                    <div className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium">
                      10G ({stats.capacity10G})
                    </div>
                  )}
                  {stats.capacityLAG > 0 && (
                    <div className="px-4 py-2 bg-gray-600 text-white rounded-full text-sm font-medium">
                      LAG ({stats.capacityLAG})
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Capacity</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatCapacity(stats.totalCapacityMbps)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Traffic</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRate(stats.totalInputTraffic + stats.totalOutputTraffic)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Asymmetric Links</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.asymmetricLinks}
                  </div>
                </div>
              </div>

              {/* Interfaces by Router */}
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Interfaces by Router</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {interfacesByRouter.map(({ router, country, count }) => (
                    <button
                      key={router}
                      onClick={() => { setSelectedRouter(router); setActiveTab('router'); }}
                      className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[country] || '#6b7280' }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{router}</span>
                      </div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{count}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interface Details */}
          {activeTab === 'interfaces' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Filters:</span>
                </div>

                <select
                  value={routerFilter}
                  onChange={(e) => setRouterFilter(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Routers</option>
                  {data.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>

                <select
                  value={capacityFilter}
                  onChange={(e) => setCapacityFilter(e.target.value as CapacityFilter)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Capacities</option>
                  <option value="1G">1G</option>
                  <option value="10G">10G</option>
                  <option value="LAG">LAG/Bundle</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>

                <div className="text-xs text-gray-500 ml-auto">
                  Showing {filteredInterfaces.length} of {interfaces.length} interfaces
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('router')}>
                        <div className="flex items-center gap-1">Router {sortField === 'router' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('interface')}>
                        <div className="flex items-center gap-1">Interface {sortField === 'interface' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Description</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('capacity')}>
                        <div className="flex items-center justify-center gap-1">Capacity {sortField === 'capacity' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Input Rate</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Output Rate</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('inputUtil')}>
                        <div className="flex items-center justify-center gap-1">In % {sortField === 'inputUtil' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('outputUtil')}>
                        <div className="flex items-center justify-center gap-1">Out % {sortField === 'outputUtil' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Neighbor</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort('cost')}>
                        <div className="flex items-center justify-center gap-1">Cost {sortField === 'cost' && <ArrowUpDown className="w-3 h-3" />}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInterfaces.map((iface, idx) => (
                      <tr key={`${iface.router}-${iface.interface}-${idx}`} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COUNTRY_COLORS[iface.routerCountry] || '#6b7280' }}
                            />
                            <span className="text-gray-900 dark:text-white">{iface.router}</span>
                            <span className="text-[10px] text-gray-400">{iface.routerCountry}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-white font-mono text-xs">{iface.interface}</span>
                            {iface.isLogical && (
                              <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">logical</span>
                            )}
                            {iface.isBundle && (
                              <span className="text-[10px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                LAG {iface.bundleMembers && `(${iface.bundleMembers}x${iface.memberSpeed})`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{iface.description}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            iface.status === 'up/up' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {iface.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-900 dark:text-white font-medium">{iface.capacity}</span>
                        </td>
                        <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">{formatRate(iface.inputRate)}</td>
                        <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">{formatRate(iface.outputRate)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium ${getUtilColor(iface.inputUtil)}`}>
                            {iface.inputUtil.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium ${getUtilColor(iface.outputUtil)}`}>
                            {iface.outputUtil.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          {iface.neighbor !== '-' ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COUNTRY_COLORS[iface.neighborCountry] || '#6b7280' }}
                              />
                              <span className="text-gray-900 dark:text-white text-xs">{iface.neighbor}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300">{iface.forwardCost}</span>
                            {iface.isAsymmetric && (
                              <>
                                <span className="text-gray-400">/</span>
                                <span className="text-xs text-amber-500">{iface.reverseCost}</span>
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Traffic Flow */}
          {activeTab === 'traffic' && (
            <div className="space-y-6">
              {/* Total Network Traffic */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-500/30 rounded-lg p-6 text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {formatRate(stats.totalInputTraffic + stats.totalOutputTraffic)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Network Traffic</div>
              </div>

              {/* Traffic Flow Between Countries */}
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Traffic Flow Between Countries</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {countryFlows.map((flow, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[flow.sourceCountry] || '#6b7280' }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{flow.sourceCountry}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[flow.destCountry] || '#6b7280' }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{flow.destCountry}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{flow.linkCount} links</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-gray-400">Input</div>
                          <div className="text-gray-700 dark:text-gray-300 font-medium">{formatRate(flow.totalInputRate)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Output</div>
                          <div className="text-gray-700 dark:text-gray-300 font-medium">{formatRate(flow.totalOutputRate)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link Traffic Details */}
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Link Traffic Details</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Source</th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Source Interface</th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Target</th>
                      <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Target Interface</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Capacity</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Input</th>
                      <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.links.map((link, idx) => {
                      const sourceId = getNodeId(link.source);
                      const targetId = getNodeId(link.target);
                      const sourceNode = getNode(sourceId);
                      const targetNode = getNode(targetId);
                      const capacity = link.source_capacity?.total_capacity_mbps || 1000;

                      return (
                        <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white">{sourceId}</span>
                              <span
                                className="text-[10px] px-1 py-0.5 rounded"
                                style={{ backgroundColor: `${COUNTRY_COLORS[sourceNode?.country || ''] || '#6b7280'}30`, color: COUNTRY_COLORS[sourceNode?.country || ''] || '#6b7280' }}
                              >
                                {sourceNode?.country}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-xs font-mono text-gray-600 dark:text-gray-300">{link.source_interface}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white">{targetId}</span>
                              <span
                                className="text-[10px] px-1 py-0.5 rounded"
                                style={{ backgroundColor: `${COUNTRY_COLORS[targetNode?.country || ''] || '#6b7280'}30`, color: COUNTRY_COLORS[targetNode?.country || ''] || '#6b7280' }}
                              >
                                {targetNode?.country}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-xs font-mono text-gray-600 dark:text-gray-300">{link.target_interface}</td>
                          <td className="p-3 text-center text-gray-900 dark:text-white font-medium">
                            {link.source_capacity?.is_bundle ? 'LAG' : (link.source_capacity?.speed || '1G')}
                          </td>
                          <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">
                            {formatRate(link.traffic?.forward_traffic_mbps || 0)}
                          </td>
                          <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">
                            {formatRate(link.traffic?.reverse_traffic_mbps || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Router */}
          {activeTab === 'router' && (
            <div className="space-y-4">
              {/* Router Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Select Router:</span>
                <div className="flex gap-2 flex-wrap">
                  {interfacesByRouter.map(({ router, country, count }) => (
                    <button
                      key={router}
                      onClick={() => setSelectedRouter(router)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedRouter === router
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COUNTRY_COLORS[country] || '#6b7280' }}
                      />
                      {router}
                      <span className={`text-xs ${selectedRouter === router ? 'text-blue-100' : 'text-gray-400'}`}>({count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Router Details */}
              {selectedRouter && (
                <div className="space-y-4">
                  {(() => {
                    const routerData = interfacesByRouter.find(r => r.router === selectedRouter);
                    if (!routerData) return null;
                    const node = getNode(selectedRouter);

                    return (
                      <>
                        {/* Router Summary */}
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedRouter}</h3>
                              <p className="text-sm text-gray-500">
                                {node?.hostname} • {node?.loopback_ip} • {routerData.country}
                              </p>
                            </div>
                            <div className="ml-auto grid grid-cols-3 gap-6 text-center">
                              <div>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{routerData.count}</div>
                                <div className="text-xs text-gray-500">Interfaces</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {routerData.interfaces.filter(i => i.status === 'up/up').length}
                                </div>
                                <div className="text-xs text-gray-500">Up</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                  {routerData.interfaces.filter(i => i.status !== 'up/up').length}
                                </div>
                                <div className="text-xs text-gray-500">Down</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Router Interfaces Table */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Interface</th>
                                <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Description</th>
                                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Capacity</th>
                                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">In/Out Rate</th>
                                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Utilization</th>
                                <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Neighbor</th>
                                <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">OSPF Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {routerData.interfaces.map((iface, idx) => (
                                <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-gray-900 dark:text-white">{iface.interface}</span>
                                      {iface.isLogical && (
                                        <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">logical</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{iface.description}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      iface.status === 'up/up' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    }`}>
                                      {iface.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-gray-900 dark:text-white font-medium">{iface.capacity}</td>
                                  <td className="p-3 text-center">
                                    <div className="text-xs">
                                      <span className="text-gray-600 dark:text-gray-300">{formatRate(iface.inputRate)}</span>
                                      <span className="text-gray-400 mx-1">/</span>
                                      <span className="text-gray-600 dark:text-gray-300">{formatRate(iface.outputRate)}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${getUtilBg(Math.max(iface.inputUtil, iface.outputUtil))}`}
                                          style={{ width: `${Math.min(Math.max(iface.inputUtil, iface.outputUtil), 100)}%` }}
                                        />
                                      </div>
                                      <span className={`text-xs font-medium ${getUtilColor(Math.max(iface.inputUtil, iface.outputUtil))}`}>
                                        {Math.max(iface.inputUtil, iface.outputUtil).toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {iface.neighbor !== '-' ? (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: COUNTRY_COLORS[iface.neighborCountry] || '#6b7280' }}
                                        />
                                        <span className="text-xs text-gray-900 dark:text-white">{iface.neighbor}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs text-gray-600 dark:text-gray-300">{iface.forwardCost}</span>
                                      {iface.isAsymmetric && (
                                        <>
                                          <span className="text-gray-400">/</span>
                                          <span className="text-xs text-amber-500">{iface.reverseCost}</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterfaceCapacityDashboard;
