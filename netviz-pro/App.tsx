import React, { useState, useEffect, useMemo } from 'react';
import NetworkGraph from './components/NetworkGraph';
import FileUpload from './components/FileUpload';
import DetailsPanel from './components/DetailsPanel';
import LinkDetailsPanel from './components/LinkDetailsPanel';
import AnalysisSidebar from './components/AnalysisSidebar';
import CostMatrixModal from './components/CostMatrixModal';
import LinkEditPanel from './components/LinkEditPanel';
import PairCountriesModal from './components/PairCountriesModal';
import ImpactAnalysisModal from './components/ImpactAnalysisModal';
import TransitAnalyzerModal from './components/TransitAnalyzerModal';
import WhatIfScenarioModal from './components/WhatIfScenarioModal';
import FullCostMatrixModal from './components/FullCostMatrixModal';
import DijkstraVisualizerModal from './components/DijkstraVisualizerModal';
import TrafficFlowModal from './components/TrafficFlowModal';
import CostOptimizerModal from './components/CostOptimizerModal';
import RippleEffectModal from './components/RippleEffectModal';
import NetworkHealthModal from './components/NetworkHealthModal';
import CapacityPlanningModal from './components/CapacityPlanningModal';
import TrafficUtilizationMatrix from './components/TrafficUtilizationMatrix';
import PrePostTrafficModal from './components/PrePostTrafficModal';
import InterfaceCapacityDashboard from './components/InterfaceCapacityDashboard';
import UserStatusBar from './components/UserStatusBar';
import AdminPanel from './components/AdminPanel';
import ChangePasswordModal from './components/ChangePasswordModal';
import DeviceManager from './components/DeviceManager';
import HostnameMappingPanel from './components/HostnameMappingPanel';
import { NetworkData, NetworkNode, PathResult, NetworkLink, HostnameMappingConfig } from './types';
import { EMPTY_NETWORK_DATA, COUNTRY_COLORS } from './constants';
import { Layout, Github, Share2, Activity, Network, Eye, EyeOff, CheckSquare, Square, Zap, AlertTriangle, Download, Trash2, GitCompare, TrendingUp, Globe, FlaskConical, Grid3X3, Route, Lightbulb, Waves, HeartPulse, HardDrive, BarChart3, GitBranch, Sun, Moon, FileDown, Server } from 'lucide-react';
import { useLocalStorage, clearLocalStorageKeys } from './hooks/useLocalStorage';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { applyHostnameMappings, DEFAULT_HOSTNAME_MAPPINGS } from './utils/hostnameMapper';
import { exportAllToSingleFile, ExportColumn } from './utils/exportUtils';
import { findAllPaths } from './utils/graphAlgorithms';

// LocalStorage Keys
const STORAGE_KEYS = {
  ORIGINAL_DATA: 'netviz_original_data',
  LINK_OVERRIDES: 'netviz_link_overrides',
  ACTIVE_COUNTRIES: 'netviz_active_countries',
  SIMULATION_MODE: 'netviz_simulation_mode'
};

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();
  // Original Data (Immutable Source) - PERSISTED
  // Starts with empty state - user uploads their topology (scalable for any size)
  const [originalData, setOriginalData] = useLocalStorage<NetworkData>(
    STORAGE_KEYS.ORIGINAL_DATA,
    EMPTY_NETWORK_DATA as NetworkData
  );

  // Hostname Mapping Config - PERSISTED
  const [hostnameMappingConfig, setHostnameMappingConfig] = useLocalStorage<HostnameMappingConfig>(
    'netviz_hostname_mapping',
    DEFAULT_HOSTNAME_MAPPINGS
  );

  // Effect: Re-apply hostname mappings when config changes
  useEffect(() => {
    if (originalData.nodes.length === 0) return;

    setOriginalData(prevData => {
      const updatedNodes = applyHostnameMappings(prevData.nodes, hostnameMappingConfig);
      
      // Only update if something actually changed to avoid infinite loops
      const hasChanges = updatedNodes.some((node, i) => 
        node.hostname !== prevData.nodes[i].hostname || 
        node.role !== prevData.nodes[i].role
      );

      if (!hasChanges) return prevData;

      return {
        ...prevData,
        nodes: updatedNodes
      };
    });
  }, [hostnameMappingConfig, setOriginalData]);

  // UI Selection State (not persisted - ephemeral)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');

  // Simulation State - PERSISTED
  const [isSimulationMode, setIsSimulationMode] = useLocalStorage<boolean>(
    STORAGE_KEYS.SIMULATION_MODE,
    false
  );
  const [linkOverrides, setLinkOverrides] = useLocalStorage<Record<number, { cost?: number; forward_cost?: number; reverse_cost?: number; status: string }>>(
    STORAGE_KEYS.LINK_OVERRIDES,
    {}
  );

  // Analysis State (not persisted - ephemeral)
  const [highlightedPath, setHighlightedPath] = useState<PathResult | null>(null);
  const [matrixConfig, setMatrixConfig] = useState<{ source: string, dest: string } | null>(null);
  const [showPairCountriesModal, setShowPairCountriesModal] = useState(false);
  const [showImpactAnalysisModal, setShowImpactAnalysisModal] = useState(false);
  const [showTransitAnalyzerModal, setShowTransitAnalyzerModal] = useState(false);
  const [showWhatIfModal, setShowWhatIfModal] = useState(false);
  const [showFullCostMatrixModal, setShowFullCostMatrixModal] = useState(false);
  const [showDijkstraVisualizer, setShowDijkstraVisualizer] = useState(false);
  const [showTrafficFlowModal, setShowTrafficFlowModal] = useState(false);
  const [showCostOptimizerModal, setShowCostOptimizerModal] = useState(false);
  const [showRippleEffectModal, setShowRippleEffectModal] = useState(false);
  const [showNetworkHealthModal, setShowNetworkHealthModal] = useState(false);
  const [showCapacityPlanningModal, setShowCapacityPlanningModal] = useState(false);
  const [showTrafficMatrixModal, setShowTrafficMatrixModal] = useState(false);
  const [showPrePostTrafficModal, setShowPrePostTrafficModal] = useState(false);
  const [showInterfaceDashboard, setShowInterfaceDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [showHostnameMappingPanel, setShowHostnameMappingPanel] = useState(false);
  
  const [analysisSelection, setAnalysisSelection] = useState<{
    source: { id: string, country: string } | null;
    dest: { id: string, country: string } | null;
  }>({ source: null, dest: null });

  // Visibility Filter State - PERSISTED
  const [activeCountries, setActiveCountries] = useLocalStorage<string[]>(
    STORAGE_KEYS.ACTIVE_COUNTRIES,
    []
  );

  // Extract unique countries
  const allCountries = useMemo(() => {
    const countries = new Set(originalData.nodes.map(n => n.country));
    return Array.from(countries).sort();
  }, [originalData]);

  // Initialize Active Countries (only if empty - first load)
  useEffect(() => {
    if (activeCountries.length === 0 && allCountries.length > 0) {
      setActiveCountries(allCountries);
    }
  }, [allCountries, activeCountries.length, setActiveCountries]); // Include all dependencies properly

  // --- Derived Data Calculation (The Simulation Engine) ---
  const currentData = useMemo(() => {
    if (!isSimulationMode) {
      return originalData;
    }

    // Clone data to avoid mutation
    const newLinks = originalData.links.map((link, index) => {
      const override = linkOverrides[index];
      if (override) {
        // Handle both old format (cost, reverse_cost) and new format (forward_cost, reverse_cost)
        const forwardCost = override.forward_cost !== undefined ? override.forward_cost : override.cost;
        const reverseCost = override.reverse_cost !== undefined ? override.reverse_cost : forwardCost;

        return {
          ...link,
          index: index, // Ensure index is preserved
          forward_cost: forwardCost,
          reverse_cost: reverseCost,
          cost: forwardCost, // Legacy field for backward compatibility
          status: override.status,
          // Preserve original values
          original_cost: link.original_cost ?? link.cost ?? link.forward_cost,
          original_forward_cost: link.original_forward_cost ?? link.forward_cost,
          original_reverse_cost: link.original_reverse_cost ?? link.reverse_cost,
          original_status: link.original_status ?? link.status,
          is_modified: true
        };
      }
      return { ...link, index: index };
    });

    return {
      ...originalData,
      links: newLinks
    };
  }, [originalData, isSimulationMode, linkOverrides]);

  // Handlers
  const handleDataLoaded = (newData: NetworkData) => {
    // Warn user if they have unsaved simulation changes
    if (isSimulationMode && Object.keys(linkOverrides).length > 0) {
      const confirmed = window.confirm(
        'Loading new data will clear your simulation changes. Continue?'
      );
      if (!confirmed) return;
    }

    // Assign indices to track links reliably across reloads
    const indexedLinks = newData.links.map((l, i) => ({ ...l, index: i }));
    setOriginalData({ ...newData, links: indexedLinks });

    // Extract countries from new data and set as active (CRITICAL FIX)
    const newCountries = Array.from(new Set(newData.nodes.map(n => n.country))).sort();
    setActiveCountries(newCountries);

    // Clear all simulation state when loading new data
    setLinkOverrides({});
    setIsSimulationMode(false);

    // Clear UI selections
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightedPath(null);
    setAnalysisSelection({ source: null, dest: null });
  };

  const handleLinkUpdate = (linkIndex: number, newForwardCost: number, newReverseCost: number | undefined, newStatus: string) => {
    setLinkOverrides(prev => ({
      ...prev,
      [linkIndex]: {
        forward_cost: newForwardCost,
        reverse_cost: newReverseCost,
        cost: newForwardCost, // Legacy field for backward compatibility
        status: newStatus
      }
    }));
  };

  const handleShowMatrix = (source: string, dest: string) => {
    setMatrixConfig({ source, dest });
  };

  const handleSetAnalysisSource = (node: NetworkNode) => {
    setAnalysisSelection(prev => ({ ...prev, source: { id: node.id, country: node.country } }));
    setActiveTab('analysis');
    setSelectedNode(null);
  };

  const handleSetAnalysisDest = (node: NetworkNode) => {
    setAnalysisSelection(prev => ({ ...prev, dest: { id: node.id, country: node.country } }));
    setActiveTab('analysis');
    setSelectedNode(null);
  };

  const toggleCountry = (country: string) => {
    setActiveCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const toggleAllCountries = () => {
    if (activeCountries.length === allCountries.length) {
      setActiveCountries([]);
    } else {
      setActiveCountries(allCountries);
    }
  };

  const handleExportTopology = () => {
    const dataStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `network_topology_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all cached data? This will reset the app to default state and reload the page.')) {
      clearLocalStorageKeys(Object.values(STORAGE_KEYS));
      window.location.reload();
    }
  };

  // Export All Analysis Data
  const handleExportAll = () => {
    if (currentData.nodes.length === 0) {
      alert('No data loaded. Please upload a topology file first.');
      return;
    }

    const getNodeId = (node: string | NetworkNode): string => {
      return typeof node === 'string' ? node : node.id;
    };

    const countries = Array.from(new Set(currentData.nodes.map(n => n.country))).sort();

    // 1. Network Topology - Nodes
    const nodesData = currentData.nodes.map(node => ({
      id: node.id,
      name: node.name || node.id,
      country: node.country,
      role: node.role || 'Router',
      loopback: node.loopback_ip || '',
    }));

    const nodesColumns: ExportColumn[] = [
      { header: 'Node ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Country', key: 'country' },
      { header: 'Role', key: 'role' },
      { header: 'Loopback IP', key: 'loopback' },
    ];

    // 2. Network Topology - Links
    const linksData = currentData.links.map((link, idx) => ({
      index: idx,
      source: getNodeId(link.source),
      target: getNodeId(link.target),
      sourceInterface: link.source_interface || '',
      targetInterface: link.target_interface || '',
      forwardCost: link.forward_cost ?? link.cost ?? 10,
      reverseCost: link.reverse_cost ?? link.forward_cost ?? link.cost ?? 10,
      status: link.status || 'up',
      isAsymmetric: (link.forward_cost !== link.reverse_cost) ? 'Yes' : 'No',
      capacityMbps: link.source_capacity?.total_capacity_mbps || '',
    }));

    const linksColumns: ExportColumn[] = [
      { header: 'Index', key: 'index' },
      { header: 'Source', key: 'source' },
      { header: 'Target', key: 'target' },
      { header: 'Source Interface', key: 'sourceInterface' },
      { header: 'Target Interface', key: 'targetInterface' },
      { header: 'Forward Cost', key: 'forwardCost' },
      { header: 'Reverse Cost', key: 'reverseCost' },
      { header: 'Status', key: 'status' },
      { header: 'Is Asymmetric', key: 'isAsymmetric' },
      { header: 'Capacity (Mbps)', key: 'capacityMbps' },
    ];

    // 3. Country Pair Paths
    const pairPathsData: any[] = [];
    countries.forEach(srcCountry => {
      countries.forEach(dstCountry => {
        if (srcCountry === dstCountry) return;
        const srcNodes = currentData.nodes.filter(n => n.country === srcCountry);
        const dstNodes = currentData.nodes.filter(n => n.country === dstCountry);

        srcNodes.forEach(srcNode => {
          dstNodes.forEach(dstNode => {
            const paths = findAllPaths(currentData.nodes, currentData.links, srcNode.id, dstNode.id, 3);
            paths.forEach((path, rank) => {
              pairPathsData.push({
                sourceCountry: srcCountry,
                destCountry: dstCountry,
                sourceNode: srcNode.id,
                destNode: dstNode.id,
                rank: rank + 1,
                path: path.nodes.join(' -> '),
                cost: path.totalCost,
                hops: path.nodes.length - 1,
              });
            });
          });
        });
      });
    });

    const pairPathsColumns: ExportColumn[] = [
      { header: 'Source Country', key: 'sourceCountry' },
      { header: 'Dest Country', key: 'destCountry' },
      { header: 'Source Node', key: 'sourceNode' },
      { header: 'Dest Node', key: 'destNode' },
      { header: 'Rank', key: 'rank' },
      { header: 'Path', key: 'path' },
      { header: 'Cost', key: 'cost' },
      { header: 'Hops', key: 'hops' },
    ];

    // 4. Transit Countries Analysis
    const transitData: any[] = [];
    const transitCounts: Record<string, { pathsThrough: number; pairsServed: Set<string> }> = {};

    countries.forEach(srcCountry => {
      countries.forEach(dstCountry => {
        if (srcCountry === dstCountry) return;
        const srcNodes = currentData.nodes.filter(n => n.country === srcCountry);
        const dstNodes = currentData.nodes.filter(n => n.country === dstCountry);

        srcNodes.forEach(srcNode => {
          dstNodes.forEach(dstNode => {
            const paths = findAllPaths(currentData.nodes, currentData.links, srcNode.id, dstNode.id, 1);
            if (paths.length > 0) {
              const bestPath = paths[0];
              bestPath.nodes.forEach(nodeId => {
                const node = currentData.nodes.find(n => n.id === nodeId);
                if (node && node.country !== srcCountry && node.country !== dstCountry) {
                  if (!transitCounts[node.country]) {
                    transitCounts[node.country] = { pathsThrough: 0, pairsServed: new Set() };
                  }
                  transitCounts[node.country].pathsThrough++;
                  transitCounts[node.country].pairsServed.add(`${srcCountry}->${dstCountry}`);
                }
              });
            }
          });
        });
      });
    });

    Object.entries(transitCounts).forEach(([country, data]) => {
      transitData.push({
        country,
        pathsThrough: data.pathsThrough,
        pairsServed: data.pairsServed.size,
        criticality: ((data.pairsServed.size / Math.max(1, countries.length * (countries.length - 1))) * 100).toFixed(1) + '%',
      });
    });

    const transitColumns: ExportColumn[] = [
      { header: 'Transit Country', key: 'country' },
      { header: 'Paths Through', key: 'pathsThrough' },
      { header: 'Country Pairs Served', key: 'pairsServed' },
      { header: 'Criticality Score', key: 'criticality' },
    ];

    // 5. Interface/Link Traffic Data
    const trafficData = currentData.links.map((link, idx) => ({
      index: idx,
      source: getNodeId(link.source),
      target: getNodeId(link.target),
      sourceInterface: link.source_interface || '',
      fwdTrafficMbps: link.traffic?.forward_traffic_mbps || 0,
      revTrafficMbps: link.traffic?.reverse_traffic_mbps || 0,
      fwdUtilPct: link.traffic?.forward_utilization_pct?.toFixed(1) || '0',
      revUtilPct: link.traffic?.reverse_utilization_pct?.toFixed(1) || '0',
      capacityMbps: link.source_capacity?.total_capacity_mbps || 'N/A',
    }));

    const trafficColumns: ExportColumn[] = [
      { header: 'Index', key: 'index' },
      { header: 'Source', key: 'source' },
      { header: 'Target', key: 'target' },
      { header: 'Interface', key: 'sourceInterface' },
      { header: 'Forward Traffic (Mbps)', key: 'fwdTrafficMbps' },
      { header: 'Reverse Traffic (Mbps)', key: 'revTrafficMbps' },
      { header: 'Forward Util %', key: 'fwdUtilPct' },
      { header: 'Reverse Util %', key: 'revUtilPct' },
      { header: 'Capacity (Mbps)', key: 'capacityMbps' },
    ];

    // Export all to single comprehensive file
    exportAllToSingleFile([
      { name: 'Network Nodes', data: nodesData, columns: nodesColumns },
      { name: 'Network Links', data: linksData, columns: linksColumns },
      { name: 'Country Pair Paths', data: pairPathsData, columns: pairPathsColumns },
      { name: 'Transit Country Analysis', data: transitData, columns: transitColumns },
      { name: 'Link Traffic Data', data: trafficData, columns: trafficColumns },
    ], 'netviz_complete_analysis');
  };

  const handleApplyScenario = (overrides: Record<number, { forward_cost?: number; reverse_cost?: number; status: string }>) => {
    setLinkOverrides(overrides);
    setIsSimulationMode(true);
  };

  const handleApplyOptimization = (changes: { linkIndex: number; newForwardCost: number; newReverseCost: number }[]) => {
    const overrides: Record<number, { forward_cost?: number; reverse_cost?: number; status: string }> = {};
    changes.forEach(change => {
      overrides[change.linkIndex] = {
        forward_cost: change.newForwardCost,
        reverse_cost: change.newReverseCost,
        status: 'up'
      };
    });
    setLinkOverrides(overrides);
    setIsSimulationMode(true);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden flex-col transition-colors duration-300">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-between px-6 z-20 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/20 shadow-lg">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              NetViz Pro
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-500">Topology Visualizer</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all mr-2"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Simulation Toggle */}
        <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-full p-1 border border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setIsSimulationMode(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!isSimulationMode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Monitor
          </button>
          <button
            onClick={() => setIsSimulationMode(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${isSimulationMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Zap className="w-3 h-3" />
            Simulation
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* File Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:flex flex-col items-end mr-2 border-r border-gray-300 dark:border-gray-700 pr-3">
            <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
              {originalData.metadata?.data_source ? `Uploaded: ${originalData.metadata.data_source}` : 'No file loaded'}
            </span>
            {originalData.metadata?.snapshot_timestamp && (
              <span className="text-[10px] opacity-70">
                {new Date(originalData.metadata.snapshot_timestamp).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Analysis Tools - Labeled Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setShowPairCountriesModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Pair</span>
            </button>
            <button
              onClick={() => setShowImpactAnalysisModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Impact</span>
            </button>
            <button
              onClick={() => setShowTransitAnalyzerModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-gray-300 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Transit</span>
            </button>
            <button
              onClick={() => setShowWhatIfModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-gray-300 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-300"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>What-If</span>
            </button>
            <button
              onClick={() => setShowFullCostMatrixModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-gray-300 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-300"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
            <button
              onClick={() => setShowDijkstraVisualizer(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border border-gray-300 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-300"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Dijkstra</span>
            </button>
            <button
              onClick={() => setShowTrafficFlowModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-pink-100 dark:hover:bg-pink-900/50 border border-gray-300 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-300"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Traffic</span>
            </button>
            <button
              onClick={() => setShowCostOptimizerModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-lime-100 dark:hover:bg-lime-900/50 border border-gray-300 dark:border-gray-700 hover:border-lime-400 dark:hover:border-lime-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-300"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Optimizer</span>
            </button>
            <button
              onClick={() => setShowRippleEffectModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-300"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Ripple</span>
            </button>
            <button
              onClick={() => setShowNetworkHealthModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-gray-300 dark:border-gray-700 hover:border-rose-400 dark:hover:border-rose-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Health</span>
            </button>
            <button
              onClick={() => setShowCapacityPlanningModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-gray-300 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-300"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Capacity</span>
            </button>
            <button
              onClick={() => setShowTrafficMatrixModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-300"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Util Matrix</span>
            </button>
            <button
              onClick={() => setShowPrePostTrafficModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-gray-300 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-300"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Pre/Post</span>
            </button>
            <button
              onClick={() => setShowInterfaceDashboard(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-300"
              title="Interface Capacity & Traffic Analysis"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Intf</span>
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

          {/* Device Manager Button */}
          <button
            onClick={() => setShowDeviceManager(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-500/50 transition-all text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-300"
            title="Device Manager - Import/Export Devices"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

          {/* Utility Buttons */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
            title="Export All Analysis Data to CSV"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden lg:inline">Export All</span>
          </button>
          <button
            onClick={handleExportTopology}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Export Topology JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-all text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Clear Cache"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

          {/* User Status */}
          <UserStatusBar
            onOpenAdmin={() => setShowAdminPanel(true)}
            onOpenSettings={() => setShowChangePasswordModal(true)}
          />
        </div>
      </header>

      {/* Simulation Warning Banner */}
      {
        isSimulationMode && (
          <div className="bg-purple-900/30 border-b border-purple-500/20 py-1 px-4 flex justify-center items-center gap-2 text-xs text-purple-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Simulation Mode Active: Click any link to modify costs or shut/no-shut interfaces. Changes are local only.</span>
          </div>
        )
      }

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col z-10 shadow-2xl">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'details'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <Network className="w-4 h-4" />
              Topology
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'analysis'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <Activity className="w-4 h-4" />
              Analysis
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'details' ? (
              <div className="h-full flex flex-col gap-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Data Source</h2>
                  <FileUpload onDataLoaded={handleDataLoaded} hostnameMappingConfig={hostnameMappingConfig || undefined} />
                  <button
                    onClick={() => setShowHostnameMappingPanel(true)}
                    className="mt-2 w-full py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Server className="w-3 h-3" />
                    Hostname Mapping {hostnameMappingConfig?.mappings.length ? `(${hostnameMappingConfig.mappings.length})` : ''}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Network Stats</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentData.nodes.length}</div>
                      <div className="text-xs text-gray-500">Nodes</div>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentData.links.length}</div>
                      <div className="text-xs text-gray-500">Links</div>
                    </div>
                  </div>

                  {originalData.metadata && (
                    <div className="bg-gray-100/50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-xs space-y-2 text-gray-600 dark:text-gray-400">
                      <p><span className="text-gray-500">Algorithm:</span> {originalData.metadata.layout_algorithm || 'N/A'}</p>
                      <p><span className="text-gray-500">Snapshot ID:</span> {originalData.metadata.snapshot_id || 'N/A'}</p>
                      <p><span className="text-gray-500">Source:</span> {originalData.metadata.data_source || 'Local'}</p>
                    </div>
                  )}

                  {isSimulationMode && Object.keys(linkOverrides).length > 0 && (
                    <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg">
                      <h3 className="text-xs font-bold text-purple-300 mb-2">Pending Changes</h3>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {Object.entries(linkOverrides).map(([idx, rawVal]) => {
                          const val = rawVal as { cost: number; status: string };
                          return (
                            <li key={idx} className="flex justify-between">
                              <span>Link #{idx}</span>
                              <span className="text-purple-400">{val.status === 'up' ? `Cost: ${val.cost}` : 'DOWN'}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        onClick={() => setLinkOverrides({})}
                        className="mt-2 w-full py-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-300"
                      >
                        Reset Simulation
                      </button>
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Filter Legend</h2>
                      <button
                        onClick={toggleAllCountries}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1"
                      >
                        {activeCountries.length === allCountries.length ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        {activeCountries.length === allCountries.length ? 'All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {allCountries.map(country => {
                        const isActive = activeCountries.includes(country);
                        const color = COUNTRY_COLORS[country] || COUNTRY_COLORS.DEFAULT;
                        return (
                          <button
                            key={country}
                            onClick={() => toggleCountry(country)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${isActive
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-50 hover:opacity-70 grayscale'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }}
                              ></span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{country}</span>
                            </div>
                            {isActive ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <AnalysisSidebar
                data={currentData}
                onPathsFound={() => { }}
                onSelectPath={setHighlightedPath}
                onShowMatrix={handleShowMatrix}
                preselectedSource={analysisSelection.source}
                preselectedDest={analysisSelection.dest}
              />
            )}
          </div>
        </div>

        {/* Visualization Area */}
        <main className="flex-1 relative bg-gray-100 dark:bg-gray-950 p-4">
          <NetworkGraph
            data={currentData}
            onNodeSelect={(node) => { setSelectedNode(node); setSelectedLink(null); }}
            onLinkSelect={(link) => { setSelectedLink(link); setSelectedNode(null); }}
            selectedNode={selectedNode}
            highlightedPath={highlightedPath}
            activeCountries={activeCountries}
            theme={theme}
          />

          {/* Overlay Node Detail Panel */}
          <DetailsPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onSetSource={handleSetAnalysisSource}
            onSetDest={handleSetAnalysisDest}
          />

          {/* Overlay Link Detail Panel (Monitor Mode) */}
          {!isSimulationMode && selectedLink && (
            <LinkDetailsPanel
              link={selectedLink}
              onClose={() => setSelectedLink(null)}
            />
          )}

          {/* Link Editor (Simulation Mode) */}
          {isSimulationMode && selectedLink && (
            <LinkEditPanel
              link={selectedLink}
              onClose={() => setSelectedLink(null)}
              onUpdate={handleLinkUpdate}
            />
          )}

          {/* Matrix Modal */}
          {matrixConfig && (
            <CostMatrixModal
              data={currentData}
              sourceCountry={matrixConfig.source}
              destCountry={matrixConfig.dest}
              onClose={() => setMatrixConfig(null)}
            />
          )}

          {/* Pair Countries Analysis Modal */}
          {showPairCountriesModal && (
            <PairCountriesModal
              data={currentData}
              onClose={() => setShowPairCountriesModal(false)}
            />
          )}

          {/* Multi-Country Impact Analysis Modal */}
          {showImpactAnalysisModal && (
            <ImpactAnalysisModal
              originalData={originalData}
              currentData={currentData}
              onClose={() => setShowImpactAnalysisModal(false)}
            />
          )}

          {/* Transit Country Analyzer Modal */}
          {showTransitAnalyzerModal && (
            <TransitAnalyzerModal
              data={currentData}
              onClose={() => setShowTransitAnalyzerModal(false)}
            />
          )}

          {/* What-If Scenario Planner Modal */}
          {showWhatIfModal && (
            <WhatIfScenarioModal
              data={currentData}
              onClose={() => setShowWhatIfModal(false)}
              onApplyScenario={handleApplyScenario}
            />
          )}

          {/* Full Cost Matrix Dashboard Modal */}
          {showFullCostMatrixModal && (
            <FullCostMatrixModal
              data={currentData}
              onClose={() => setShowFullCostMatrixModal(false)}
            />
          )}

          {/* Dijkstra Algorithm Visualizer Modal */}
          {showDijkstraVisualizer && (
            <DijkstraVisualizerModal
              data={currentData}
              onClose={() => setShowDijkstraVisualizer(false)}
            />
          )}

          {/* Traffic Flow Analyzer Modal */}
          {showTrafficFlowModal && (
            <TrafficFlowModal
              data={currentData}
              onClose={() => setShowTrafficFlowModal(false)}
            />
          )}

          {/* OSPF Cost Optimizer Modal */}
          {showCostOptimizerModal && (
            <CostOptimizerModal
              data={currentData}
              onClose={() => setShowCostOptimizerModal(false)}
              onApplyChanges={handleApplyOptimization}
            />
          )}

          {/* Ripple Effect Analyzer Modal */}
          {showRippleEffectModal && (
            <RippleEffectModal
              data={currentData}
              onClose={() => setShowRippleEffectModal(false)}
            />
          )}

          {/* Network Health Dashboard Modal */}
          {showNetworkHealthModal && (
            <NetworkHealthModal
              data={currentData}
              onClose={() => setShowNetworkHealthModal(false)}
            />
          )}

          {/* Capacity Planning Dashboard Modal */}
          {showCapacityPlanningModal && (
            <CapacityPlanningModal
              data={currentData}
              onClose={() => setShowCapacityPlanningModal(false)}
            />
          )}

          {/* Traffic Utilization Matrix Modal */}
          {showTrafficMatrixModal && (
            <TrafficUtilizationMatrix
              data={currentData}
              onClose={() => setShowTrafficMatrixModal(false)}
            />
          )}

          {/* Pre/Post Traffic Analyzer Modal */}
          {showPrePostTrafficModal && (
            <PrePostTrafficModal
              data={currentData}
              onClose={() => setShowPrePostTrafficModal(false)}
            />
          )}

          {/* Interface Capacity Dashboard Modal */}
          {showInterfaceDashboard && (
            <InterfaceCapacityDashboard
              data={currentData}
              onClose={() => setShowInterfaceDashboard(false)}
            />
          )}

          {/* Admin Panel Modal */}
          {showAdminPanel && isAdmin && (
            <AdminPanel
              isOpen={showAdminPanel}
              onClose={() => setShowAdminPanel(false)}
            />
          )}

          {/* Change Password Modal */}
          {showChangePasswordModal && (
            <ChangePasswordModal
              isOpen={showChangePasswordModal}
              onClose={() => setShowChangePasswordModal(false)}
            />
          )}

          {/* Device Manager Modal */}
          {showDeviceManager && (
            <DeviceManager
              isOpen={showDeviceManager}
              onClose={() => setShowDeviceManager(false)}
            />
          )}

          {/* Hostname Mapping Panel */}
          <HostnameMappingPanel
            isOpen={showHostnameMappingPanel}
            onClose={() => setShowHostnameMappingPanel(false)}
            currentConfig={hostnameMappingConfig}
            onConfigChange={setHostnameMappingConfig}
          />
        </main>
      </div>
    </div >
  );
};

export default App;