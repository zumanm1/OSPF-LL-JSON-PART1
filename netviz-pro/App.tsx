import React, { useState, useEffect, useMemo } from 'react';
import NetworkGraph from './components/NetworkGraph';
import FileUpload from './components/FileUpload';
import DetailsPanel from './components/DetailsPanel';
import LinkDetailsPanel from './components/LinkDetailsPanel';
import AnalysisSidebar from './components/AnalysisSidebar';
import CostMatrixModal from './components/CostMatrixModal';
import LinkEditPanel from './components/LinkEditPanel';
import { NetworkData, NetworkNode, PathResult, NetworkLink } from './types';
import { SAMPLE_DATA, COUNTRY_COLORS } from './constants';
import { Layout, Github, Share2, Activity, Network, Eye, EyeOff, CheckSquare, Square, Zap, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useLocalStorage, clearLocalStorageKeys } from './hooks/useLocalStorage';

// LocalStorage Keys
const STORAGE_KEYS = {
  ORIGINAL_DATA: 'netviz_original_data',
  LINK_OVERRIDES: 'netviz_link_overrides',
  ACTIVE_COUNTRIES: 'netviz_active_countries',
  SIMULATION_MODE: 'netviz_simulation_mode'
};

const App: React.FC = () => {
  // Original Data (Immutable Source) - PERSISTED
  const [originalData, setOriginalData] = useLocalStorage<NetworkData>(
    STORAGE_KEYS.ORIGINAL_DATA, 
    SAMPLE_DATA as unknown as NetworkData
  );
  
  // UI Selection State (not persisted - ephemeral)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);
  
  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');
  
  // Simulation State - PERSISTED
  const [isSimulationMode, setIsSimulationMode] = useLocalStorage<boolean>(
    STORAGE_KEYS.SIMULATION_MODE,
    false
  );
  const [linkOverrides, setLinkOverrides] = useLocalStorage<Record<number, { cost: number; reverse_cost?: number; status: string }>>(
    STORAGE_KEYS.LINK_OVERRIDES,
    {}
  );
  
  // Analysis State (not persisted - ephemeral)
  const [highlightedPath, setHighlightedPath] = useState<PathResult | null>(null);
  const [matrixConfig, setMatrixConfig] = useState<{source: string, dest: string} | null>(null);
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
  }, [allCountries]); // Intentionally not including activeCountries to avoid loop

  // --- Derived Data Calculation (The Simulation Engine) ---
  const currentData = useMemo(() => {
      if (!isSimulationMode) {
          return originalData;
      }

      // Clone data to avoid mutation
      const newLinks = originalData.links.map((link, index) => {
          const override = linkOverrides[index];
          if (override) {
              return {
                  ...link,
                  index: index, // Ensure index is preserved
                  cost: override.cost,
                  reverse_cost: override.reverse_cost !== undefined ? override.reverse_cost : (link.reverse_cost ?? override.cost),
                  status: override.status,
                  original_cost: link.original_cost ?? link.cost,
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
    // Assign indices if missing to track links reliably
    const indexedLinks = newData.links.map((l, i) => ({ ...l, index: i }));
    setOriginalData({ ...newData, links: indexedLinks });
    setLinkOverrides({});
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightedPath(null);
    setAnalysisSelection({ source: null, dest: null });
  };

  const handleLinkUpdate = (linkIndex: number, newCost: number, newReverseCost: number | undefined, newStatus: string) => {
      setLinkOverrides(prev => ({
          ...prev,
          [linkIndex]: { cost: newCost, reverse_cost: newReverseCost, status: newStatus }
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

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden flex-col">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/20 shadow-lg">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              NetViz Pro
            </h1>
            <p className="text-xs text-gray-500">Topology Visualizer</p>
          </div>
        </div>

        {/* Simulation Toggle */}
        <div className="flex items-center bg-gray-800 rounded-full p-1 border border-gray-700">
            <button
                onClick={() => setIsSimulationMode(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!isSimulationMode ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Monitor
            </button>
             <button
                onClick={() => setIsSimulationMode(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${isSimulationMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:text-gray-300'}`}
            >
                <Zap className="w-3 h-3" />
                Simulation
            </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500 hidden md:block">
             {originalData.metadata ? (
                 <span>Snapshot: {new Date(originalData.timestamp || Date.now()).toLocaleDateString()}</span>
             ) : <span>Sample Data Loaded</span>}
          </div>
          <button 
            onClick={handleExportTopology}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            title="Export Topology JSON"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={handleClearCache}
            className="p-2 hover:bg-red-900/50 rounded-full transition-colors text-gray-400 hover:text-red-400"
            title="Clear Cached Data"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <Share2 className="w-5 h-5" />
          </button>
           <button className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <Github className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Simulation Warning Banner */}
      {isSimulationMode && (
          <div className="bg-purple-900/30 border-b border-purple-500/20 py-1 px-4 flex justify-center items-center gap-2 text-xs text-purple-200">
              <AlertTriangle className="w-3 h-3" />
              <span>Simulation Mode Active: Click any link to modify costs or shut/no-shut interfaces. Changes are local only.</span>
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-800 bg-gray-900 flex flex-col z-10 shadow-2xl">
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-800">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === 'details' 
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    <Network className="w-4 h-4" />
                    Topology
                </button>
                 <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === 'analysis' 
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
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
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Source</h2>
                            <FileUpload onDataLoaded={handleDataLoaded} />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                             <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Network Stats</h2>
                             
                             <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                    <div className="text-2xl font-bold text-white">{currentData.nodes.length}</div>
                                    <div className="text-xs text-gray-500">Nodes</div>
                                </div>
                                 <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                    <div className="text-2xl font-bold text-white">{currentData.links.length}</div>
                                    <div className="text-xs text-gray-500">Links</div>
                                </div>
                             </div>
                             
                             {originalData.metadata && (
                                 <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 text-xs space-y-2 text-gray-400">
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
                                        className="mt-2 w-full py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded text-gray-300"
                                     >
                                         Reset Simulation
                                     </button>
                                 </div>
                             )}

                             <div className="mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Filter Legend</h2>
                                    <button 
                                        onClick={toggleAllCountries}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        {activeCountries.length === allCountries.length ? <CheckSquare className="w-3 h-3"/> : <Square className="w-3 h-3"/>}
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
                                                className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${
                                                    isActive 
                                                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                                                    : 'bg-gray-900 border-gray-800 opacity-50 hover:opacity-70 grayscale'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span 
                                                        className="w-3 h-3 rounded-full shadow-sm" 
                                                        style={{ backgroundColor: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }}
                                                    ></span>
                                                    <span className="text-sm text-gray-300 font-medium">{country}</span>
                                                </div>
                                                {isActive ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
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
                        onPathsFound={() => {}}
                        onSelectPath={setHighlightedPath}
                        onShowMatrix={handleShowMatrix}
                        preselectedSource={analysisSelection.source}
                        preselectedDest={analysisSelection.dest}
                    />
                )}
            </div>
        </div>

        {/* Visualization Area */}
        <main className="flex-1 relative bg-gray-950 p-4">
          <NetworkGraph 
            data={currentData} 
            onNodeSelect={(node) => { setSelectedNode(node); setSelectedLink(null); }} 
            onLinkSelect={(link) => { setSelectedLink(link); setSelectedNode(null); }}
            selectedNode={selectedNode}
            highlightedPath={highlightedPath}
            activeCountries={activeCountries}
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
        </main>
      </div>
    </div>
  );
};

export default App;