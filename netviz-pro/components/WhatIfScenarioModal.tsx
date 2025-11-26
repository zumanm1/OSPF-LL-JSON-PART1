import React, { useState, useMemo, useCallback } from 'react';
import { NetworkData, NetworkLink, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, FlaskConical, Plus, Trash2, Play, ArrowRight, AlertTriangle, Check, Copy, Zap, RefreshCw, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface WhatIfScenarioModalProps {
  data: NetworkData;
  onClose: () => void;
  onApplyScenario?: (linkOverrides: Record<number, { forward_cost?: number; reverse_cost?: number; status: string }>) => void;
}

interface LinkChange {
  linkIndex: number;
  originalForwardCost: number;
  originalReverseCost: number;
  originalStatus: string;
  newForwardCost?: number;
  newReverseCost?: number;
  newStatus?: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  changes: LinkChange[];
}

interface RouteChange {
  sourceCountry: string;
  destCountry: string;
  beforePath: string[];
  afterPath: string[];
  beforeCost: number;
  afterCost: number;
  costDelta: number;
  severity: 'broken' | 'major' | 'minor' | 'improved';
}

interface ScenarioImpact {
  scenarioId: string;
  pathsAffected: number;
  totalPaths: number;
  affectedPercentage: number;
  countryPairsAffected: number;
  avgCostChange: number;
  riskScore: number;
  transitChanges: { added: string[]; removed: string[] };
  pathComparison: {
    sourceCountry: string;
    destCountry: string;
    beforeCost: number;
    afterCost: number;
    costDelta: number;
    pathChanged: boolean;
  }[];
  // New: Detailed reroute information
  routeChanges: RouteChange[];
  brokenConnections: number;
  majorReroutes: number;
  minorReroutes: number;
  improvedRoutes: number;
}

const generateScenarioId = () => `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const WhatIfScenarioModal: React.FC<WhatIfScenarioModalProps> = ({ data, onClose, onApplyScenario }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: generateScenarioId(), name: 'Scenario A', description: '', changes: [] }
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);

  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  const getLinkLabel = useCallback((link: NetworkLink) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return `${sourceId} <-> ${targetId}`;
  }, []);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // Apply scenario changes to links
  const applyScenarioToLinks = useCallback((scenario: Scenario): NetworkLink[] => {
    return data.links.map((link, index) => {
      const change = scenario.changes.find(c => c.linkIndex === index);
      if (change) {
        return {
          ...link,
          forward_cost: change.newForwardCost ?? link.forward_cost,
          reverse_cost: change.newReverseCost ?? link.reverse_cost,
          status: change.newStatus ?? link.status
        };
      }
      return link;
    });
  }, [data.links]);

  // Calculate impact for a scenario
  const calculateScenarioImpact = useCallback((scenario: Scenario): ScenarioImpact => {
    const modifiedLinks = applyScenarioToLinks(scenario);
    const pathComparison: ScenarioImpact['pathComparison'] = [];
    const routeChanges: RouteChange[] = [];
    let totalPaths = 0;
    let pathsAffected = 0;
    let totalCostChange = 0;
    let costChangeCount = 0;
    let brokenConnections = 0;
    let majorReroutes = 0;
    let minorReroutes = 0;
    let improvedRoutes = 0;
    const affectedPairs = new Set<string>();
    const transitBefore = new Set<string>();
    const transitAfter = new Set<string>();

    countries.forEach(sourceCountry => {
      const sourceNodes = data.nodes.filter(n => n.country === sourceCountry);

      countries.forEach(destCountry => {
        if (sourceCountry === destCountry) return;

        const destNodes = data.nodes.filter(n => n.country === destCountry);
        let beforeMinCost = Infinity;
        let afterMinCost = Infinity;
        let beforePath: PathResult | null = null;
        let afterPath: PathResult | null = null;

        sourceNodes.forEach(sNode => {
          destNodes.forEach(dNode => {
            // Get best path before
            const pathsBefore = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 1);
            if (pathsBefore.length > 0 && pathsBefore[0].totalCost < beforeMinCost) {
              beforeMinCost = pathsBefore[0].totalCost;
              beforePath = pathsBefore[0];
            }
            totalPaths += pathsBefore.length;

            // Get best path after
            const pathsAfter = findAllPaths(data.nodes, modifiedLinks, sNode.id, dNode.id, 1);
            if (pathsAfter.length > 0 && pathsAfter[0].totalCost < afterMinCost) {
              afterMinCost = pathsAfter[0].totalCost;
              afterPath = pathsAfter[0];
            }

            // Track transit countries
            if (beforePath) {
              beforePath.nodes.slice(1, -1).forEach(nodeId => {
                const node = data.nodes.find(n => n.id === nodeId);
                if (node && node.country !== sourceCountry && node.country !== destCountry) {
                  transitBefore.add(node.country);
                }
              });
            }
            if (afterPath) {
              afterPath.nodes.slice(1, -1).forEach(nodeId => {
                const node = data.nodes.find(n => n.id === nodeId);
                if (node && node.country !== sourceCountry && node.country !== destCountry) {
                  transitAfter.add(node.country);
                }
              });
            }
          });
        });

        if (beforeMinCost !== Infinity || afterMinCost !== Infinity) {
          const costDelta = (afterMinCost === Infinity ? 0 : afterMinCost) -
            (beforeMinCost === Infinity ? 0 : beforeMinCost);
          const pathChanged = beforePath && afterPath ?
            beforePath.nodes.join(',') !== afterPath.nodes.join(',') :
            beforeMinCost !== afterMinCost;

          if (pathChanged || costDelta !== 0) {
            pathsAffected++;
            affectedPairs.add(`${sourceCountry}->${destCountry}`);
            totalCostChange += costDelta;
            costChangeCount++;

            // Determine severity and track route changes
            let severity: RouteChange['severity'] = 'minor';
            if (afterMinCost === Infinity && beforeMinCost !== Infinity) {
              severity = 'broken';
              brokenConnections++;
            } else if (costDelta < 0) {
              severity = 'improved';
              improvedRoutes++;
            } else if (costDelta > 50 || (beforeMinCost > 0 && costDelta / beforeMinCost > 0.5)) {
              severity = 'major';
              majorReroutes++;
            } else {
              minorReroutes++;
            }

            routeChanges.push({
              sourceCountry,
              destCountry,
              beforePath: beforePath?.nodes || [],
              afterPath: afterPath?.nodes || [],
              beforeCost: beforeMinCost === Infinity ? -1 : beforeMinCost,
              afterCost: afterMinCost === Infinity ? -1 : afterMinCost,
              costDelta,
              severity
            });
          }

          pathComparison.push({
            sourceCountry,
            destCountry,
            beforeCost: beforeMinCost === Infinity ? -1 : beforeMinCost,
            afterCost: afterMinCost === Infinity ? -1 : afterMinCost,
            costDelta,
            pathChanged: pathChanged || false
          });
        }
      });
    });

    // Calculate transit changes
    const transitAdded = Array.from(transitAfter).filter(t => !transitBefore.has(t));
    const transitRemoved = Array.from(transitBefore).filter(t => !transitAfter.has(t));

    // Calculate risk score (0-100)
    const affectedRatio = totalPaths > 0 ? pathsAffected / totalPaths : 0;
    const avgAbsCostChange = costChangeCount > 0 ? Math.abs(totalCostChange / costChangeCount) : 0;
    const transitChangeScore = (transitAdded.length + transitRemoved.length) * 10;
    const brokenPenalty = brokenConnections * 20;
    const riskScore = Math.min(100, Math.round(
      affectedRatio * 40 +
      Math.min(avgAbsCostChange / 100, 1) * 20 +
      transitChangeScore +
      brokenPenalty
    ));

    return {
      scenarioId: scenario.id,
      pathsAffected,
      totalPaths,
      affectedPercentage: totalPaths > 0 ? (pathsAffected / totalPaths) * 100 : 0,
      countryPairsAffected: affectedPairs.size,
      avgCostChange: costChangeCount > 0 ? totalCostChange / costChangeCount : 0,
      riskScore,
      transitChanges: { added: transitAdded, removed: transitRemoved },
      pathComparison: pathComparison.filter(p => p.pathChanged || p.costDelta !== 0)
        .sort((a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta)),
      routeChanges: routeChanges.sort((a, b) => {
        // Sort by severity first, then by cost delta
        const severityOrder = { broken: 0, major: 1, minor: 2, improved: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return Math.abs(b.costDelta) - Math.abs(a.costDelta);
      }),
      brokenConnections,
      majorReroutes,
      minorReroutes,
      improvedRoutes
    };
  }, [data, countries, applyScenarioToLinks]);

  // Memoized impacts for all scenarios
  const scenarioImpacts = useMemo(() => {
    return scenarios.reduce((acc, scenario) => {
      if (scenario.changes.length > 0) {
        acc[scenario.id] = calculateScenarioImpact(scenario);
      }
      return acc;
    }, {} as Record<string, ScenarioImpact>);
  }, [scenarios, calculateScenarioImpact]);

  // Find best scenario (lowest risk)
  const bestScenario = useMemo(() => {
    const impacts = Object.values(scenarioImpacts) as ScenarioImpact[];
    if (impacts.length === 0) return null;
    return impacts.reduce((best, current) =>
      current.riskScore < best.riskScore ? current : best
    );
  }, [scenarioImpacts]);

  // Handlers
  const addScenario = () => {
    if (scenarios.length >= 4) return;
    const letters = ['A', 'B', 'C', 'D'];
    const newScenario: Scenario = {
      id: generateScenarioId(),
      name: `Scenario ${letters[scenarios.length]}`,
      description: '',
      changes: []
    };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    if (activeScenarioId === id) {
      setActiveScenarioId(newScenarios[0].id);
    }
  };

  const duplicateScenario = (id: string) => {
    if (scenarios.length >= 4) return;
    const source = scenarios.find(s => s.id === id);
    if (!source) return;
    const letters = ['A', 'B', 'C', 'D'];
    const newScenario: Scenario = {
      id: generateScenarioId(),
      name: `${source.name} (Copy)`,
      description: source.description,
      changes: [...source.changes]
    };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const updateScenario = (id: string, updates: Partial<Scenario>) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addLinkChange = (linkIndex: number) => {
    if (!activeScenario) return;
    const link = data.links[linkIndex];
    if (!link) return;

    const existingChange = activeScenario.changes.find(c => c.linkIndex === linkIndex);
    if (existingChange) return;

    const newChange: LinkChange = {
      linkIndex,
      originalForwardCost: link.forward_cost ?? link.cost,
      originalReverseCost: link.reverse_cost ?? link.forward_cost ?? link.cost,
      originalStatus: link.status,
      newForwardCost: link.forward_cost ?? link.cost,
      newReverseCost: link.reverse_cost ?? link.forward_cost ?? link.cost,
      newStatus: link.status
    };

    updateScenario(activeScenarioId, {
      changes: [...activeScenario.changes, newChange]
    });
    setSelectedLinkIndex(null);
  };

  const updateLinkChange = (linkIndex: number, updates: Partial<LinkChange>) => {
    if (!activeScenario) return;
    updateScenario(activeScenarioId, {
      changes: activeScenario.changes.map(c =>
        c.linkIndex === linkIndex ? { ...c, ...updates } : c
      )
    });
  };

  const removeLinkChange = (linkIndex: number) => {
    if (!activeScenario) return;
    updateScenario(activeScenarioId, {
      changes: activeScenario.changes.filter(c => c.linkIndex !== linkIndex)
    });
  };

  const handleApplyScenario = () => {
    if (!activeScenario || !onApplyScenario) return;
    const overrides: Record<number, { forward_cost?: number; reverse_cost?: number; status: string }> = {};
    activeScenario.changes.forEach(change => {
      overrides[change.linkIndex] = {
        forward_cost: change.newForwardCost,
        reverse_cost: change.newReverseCost,
        status: change.newStatus || 'up'
      };
    });
    onApplyScenario(overrides);
    onClose();
  };

  const activeImpact = activeScenario && scenarioImpacts[activeScenario.id];

  const handleExport = () => {
    if (!activeScenario || !activeImpact) return;

    const exportData = activeScenario.changes.map(change => {
      const link = data.links[change.linkIndex];
      const source = typeof link.source === 'object' ? link.source.id : link.source;
      const target = typeof link.target === 'object' ? link.target.id : link.target;
      return {
        link: `${source} ↔ ${target}`,
        originalFwdCost: change.originalForwardCost,
        originalRevCost: change.originalReverseCost,
        newFwdCost: change.newForwardCost ?? change.originalForwardCost,
        newRevCost: change.newReverseCost ?? change.originalReverseCost,
        status: change.newStatus || 'up',
      };
    });

    const columns: ExportColumn[] = [
      { header: 'Link', key: 'link' },
      { header: 'Original Fwd Cost', key: 'originalFwdCost' },
      { header: 'Original Rev Cost', key: 'originalRevCost' },
      { header: 'New Fwd Cost', key: 'newFwdCost' },
      { header: 'New Rev Cost', key: 'newRevCost' },
      { header: 'Status', key: 'status' },
    ];

    exportToCSV(exportData, columns, `whatif_scenario_${activeScenario.name.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              What-If Scenario Planner
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Compare multiple cost change scenarios side-by-side
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeScenario && activeScenario.changes.length > 0 && (
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

        {/* Scenario Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${activeScenarioId === scenario.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              onClick={() => setActiveScenarioId(scenario.id)}
            >
              <span className="font-medium">{scenario.name}</span>
              {scenario.changes.length > 0 && (
                <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded">
                  {scenario.changes.length} changes
                </span>
              )}
              {scenarioImpacts[scenario.id] && bestScenario?.scenarioId === scenario.id && (
                <Check className="w-4 h-4 text-green-400" title="Best scenario" />
              )}
              {scenarios.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeScenario(scenario.id); }}
                  className="p-0.5 hover:bg-black/30 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {scenarios.length < 4 && (
            <button
              onClick={addScenario}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Scenario
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${showComparison
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <RefreshCw className="w-4 h-4" />
            Compare All
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!showComparison ? (
            <>
              {/* Link Selector */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Add Link Changes</h3>
                  {activeScenario && (
                    <button
                      onClick={() => duplicateScenario(activeScenario.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      title="Duplicate Scenario"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Scenario Description */}
                {activeScenario && (
                  <input
                    type="text"
                    value={activeScenario.description}
                    onChange={(e) => updateScenario(activeScenarioId, { description: e.target.value })}
                    placeholder="Scenario description..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 mb-4"
                  />
                )}

                {/* Link List */}
                <div className="space-y-1">
                  {data.links.map((link, index) => {
                    const isAdded = activeScenario?.changes.some(c => c.linkIndex === index);
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const sourceNode = data.nodes.find(n => n.id === sourceId);
                    const targetNode = data.nodes.find(n => n.id === targetId);

                    return (
                      <button
                        key={index}
                        onClick={() => !isAdded && addLinkChange(index)}
                        disabled={isAdded}
                        className={`w-full text-left p-2 rounded-lg text-sm transition-all ${isAdded
                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-500/30 opacity-60 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COUNTRY_COLORS[sourceNode?.country || ''] || '#6b7280' }}
                          />
                          <span className="text-gray-900 dark:text-white">{sourceId}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COUNTRY_COLORS[targetNode?.country || ''] || '#6b7280' }}
                          />
                          <span className="text-gray-900 dark:text-white">{targetId}</span>
                          {isAdded && <Check className="w-3 h-3 text-purple-500 dark:text-purple-400 ml-auto" />}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Cost: {link.forward_cost ?? link.cost} / {link.reverse_cost ?? link.forward_cost ?? link.cost}
                          {link.status !== 'up' && <span className="text-red-500 dark:text-red-400 ml-2">({link.status})</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Changes Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeScenario && activeScenario.changes.length > 0 ? (
                  <div className="space-y-6">
                    {/* Changes List */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                        Link Modifications ({activeScenario.changes.length})
                      </h3>
                      <div className="space-y-3">
                        {activeScenario.changes.map(change => {
                          const link = data.links[change.linkIndex];
                          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                          const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                          return (
                            <div
                              key={change.linkIndex}
                              className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {sourceId} <ArrowRight className="w-4 h-4 inline text-gray-400 dark:text-gray-500" /> {targetId}
                                </div>
                                <button
                                  onClick={() => removeLinkChange(change.linkIndex)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                {/* Forward Cost */}
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                    Forward Cost ({sourceId} → {targetId})
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{change.originalForwardCost}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                    <input
                                      type="number"
                                      value={change.newForwardCost ?? change.originalForwardCost}
                                      onChange={(e) => updateLinkChange(change.linkIndex, {
                                        newForwardCost: parseInt(e.target.value) || 0
                                      })}
                                      className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                    />
                                  </div>
                                </div>

                                {/* Reverse Cost */}
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                    Reverse Cost ({targetId} → {sourceId})
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{change.originalReverseCost}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                    <input
                                      type="number"
                                      value={change.newReverseCost ?? change.originalReverseCost}
                                      onChange={(e) => updateLinkChange(change.linkIndex, {
                                        newReverseCost: parseInt(e.target.value) || 0
                                      })}
                                      className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                    />
                                  </div>
                                </div>

                                {/* Status */}
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</label>
                                  <select
                                    value={change.newStatus ?? change.originalStatus}
                                    onChange={(e) => updateLinkChange(change.linkIndex, {
                                      newStatus: e.target.value
                                    })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                  >
                                    <option value="up">Up</option>
                                    <option value="down">Down</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Impact Analysis */}
                    {activeImpact && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Impact Analysis</h3>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeImpact.pathsAffected}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Paths Affected</div>
                            <div className="text-xs text-gray-500">{activeImpact.affectedPercentage.toFixed(1)}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeImpact.countryPairsAffected}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Country Pairs</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className={`text-2xl font-bold ${activeImpact.avgCostChange > 0 ? 'text-red-500 dark:text-red-400' : activeImpact.avgCostChange < 0 ? 'text-green-500 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {activeImpact.avgCostChange > 0 ? '+' : ''}{activeImpact.avgCostChange.toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Avg Cost Change</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className={`text-2xl font-bold ${activeImpact.riskScore >= 70 ? 'text-red-500 dark:text-red-400' :
                                activeImpact.riskScore >= 40 ? 'text-yellow-500 dark:text-yellow-400' : 'text-green-500 dark:text-green-400'
                              }`}>
                              {activeImpact.riskScore}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Risk Score</div>
                          </div>
                        </div>

                        {/* Reroute Impact Summary */}
                        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Reroute Impact Summary</h4>
                          <div className="grid grid-cols-4 gap-3">
                            {activeImpact.brokenConnections > 0 && (
                              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">{activeImpact.brokenConnections}</div>
                                <div className="text-[10px] text-red-500 dark:text-red-400 uppercase">Broken</div>
                              </div>
                            )}
                            {activeImpact.majorReroutes > 0 && (
                              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{activeImpact.majorReroutes}</div>
                                <div className="text-[10px] text-orange-500 dark:text-orange-400 uppercase">Major</div>
                              </div>
                            )}
                            {activeImpact.minorReroutes > 0 && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{activeImpact.minorReroutes}</div>
                                <div className="text-[10px] text-yellow-600 dark:text-yellow-400 uppercase">Minor</div>
                              </div>
                            )}
                            {activeImpact.improvedRoutes > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">{activeImpact.improvedRoutes}</div>
                                <div className="text-[10px] text-green-500 dark:text-green-400 uppercase">Improved</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transit Changes */}
                        {(activeImpact.transitChanges.added.length > 0 || activeImpact.transitChanges.removed.length > 0) && (
                          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Transit Country Changes</h4>
                            <div className="flex gap-4">
                              {activeImpact.transitChanges.added.length > 0 && (
                                <div>
                                  <span className="text-xs text-green-500 dark:text-green-400">+ Added:</span>
                                  <span className="text-xs text-gray-900 dark:text-white ml-2">{activeImpact.transitChanges.added.join(', ')}</span>
                                </div>
                              )}
                              {activeImpact.transitChanges.removed.length > 0 && (
                                <div>
                                  <span className="text-xs text-red-500 dark:text-red-400">- Removed:</span>
                                  <span className="text-xs text-gray-900 dark:text-white ml-2">{activeImpact.transitChanges.removed.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detailed Route Changes */}
                        {activeImpact.routeChanges.length > 0 && (
                          <div className="bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Detailed Route Changes</h4>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {activeImpact.routeChanges.slice(0, 10).map((change, idx) => (
                                <div key={idx} className={`p-3 border-b border-gray-200 dark:border-gray-700/50 last:border-b-0 ${
                                  change.severity === 'broken' ? 'bg-red-50/50 dark:bg-red-900/10' :
                                  change.severity === 'major' ? 'bg-orange-50/50 dark:bg-orange-900/10' :
                                  change.severity === 'improved' ? 'bg-green-50/50 dark:bg-green-900/10' :
                                  ''
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${
                                        change.severity === 'broken' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' :
                                        change.severity === 'major' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300' :
                                        change.severity === 'improved' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300' :
                                        'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300'
                                      }`}>
                                        {change.severity}
                                      </span>
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: COUNTRY_COLORS[change.sourceCountry] || '#6b7280' }}
                                      />
                                      <span className="text-sm text-gray-900 dark:text-white">{change.sourceCountry}</span>
                                      <ArrowRight className="w-3 h-3 text-gray-400" />
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: COUNTRY_COLORS[change.destCountry] || '#6b7280' }}
                                      />
                                      <span className="text-sm text-gray-900 dark:text-white">{change.destCountry}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">{change.beforeCost === -1 ? 'N/A' : change.beforeCost}</span>
                                      <ArrowRight className="w-3 h-3 text-gray-400" />
                                      <span className={`text-xs font-medium ${
                                        change.severity === 'broken' ? 'text-red-500' :
                                        change.severity === 'improved' ? 'text-green-500' :
                                        'text-gray-900 dark:text-white'
                                      }`}>
                                        {change.afterCost === -1 ? 'N/A' : change.afterCost}
                                      </span>
                                      {change.costDelta !== 0 && (
                                        <span className={`text-[10px] px-1 py-0.5 rounded ${
                                          change.costDelta > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' :
                                          'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                                        }`}>
                                          {change.costDelta > 0 ? '+' : ''}{change.costDelta}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Path Comparison */}
                                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                      <span className="text-gray-400">Before:</span>
                                      <div className="flex flex-wrap gap-0.5 mt-1">
                                        {change.beforePath.length > 0 ? change.beforePath.map((node, i) => (
                                          <span key={i} className="text-gray-600 dark:text-gray-400">
                                            {node}{i < change.beforePath.length - 1 ? ' → ' : ''}
                                          </span>
                                        )) : <span className="text-gray-400 italic">No path</span>}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">After:</span>
                                      <div className="flex flex-wrap gap-0.5 mt-1">
                                        {change.afterPath.length > 0 ? change.afterPath.map((node, i) => (
                                          <span key={i} className={`${
                                            !change.beforePath.includes(node) ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-400'
                                          }`}>
                                            {node}{i < change.afterPath.length - 1 ? ' → ' : ''}
                                          </span>
                                        )) : <span className="text-red-400 italic">Connection lost</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {activeImpact.routeChanges.length > 10 && (
                                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                                  +{activeImpact.routeChanges.length - 10} more route changes
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Path Changes Table */}
                        {activeImpact.pathComparison.length > 0 && (
                          <div className="bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Route</th>
                                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Before</th>
                                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">After</th>
                                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Delta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeImpact.pathComparison.slice(0, 10).map((comp, idx) => (
                                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: COUNTRY_COLORS[comp.sourceCountry] || '#6b7280' }}
                                        />
                                        <span className="text-gray-900 dark:text-white">{comp.sourceCountry}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: COUNTRY_COLORS[comp.destCountry] || '#6b7280' }}
                                        />
                                        <span className="text-gray-900 dark:text-white">{comp.destCountry}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                      {comp.beforeCost === -1 ? 'N/A' : comp.beforeCost}
                                    </td>
                                    <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                      {comp.afterCost === -1 ? 'N/A' : comp.afterCost}
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className={`px-2 py-0.5 rounded text-xs ${comp.costDelta > 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300' :
                                          comp.costDelta < 0 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300' :
                                            'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}>
                                        {comp.costDelta > 0 ? '+' : ''}{comp.costDelta}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Apply Button */}
                    {onApplyScenario && (
                      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                          onClick={handleApplyScenario}
                          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all"
                        >
                          <Zap className="w-4 h-4" />
                          Apply to Simulation Mode
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Select links from the left panel to modify</p>
                      <p className="text-sm mt-2">Create "what-if" scenarios by changing link costs or status</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Comparison View */
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Scenario Comparison</h3>

              {Object.keys(scenarioImpacts).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No scenarios with changes to compare</p>
                  <p className="text-sm mt-2">Add link modifications to at least one scenario</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {scenarios.map(scenario => {
                    const impact = scenarioImpacts[scenario.id];
                    if (!impact) return null;

                    const isBest = bestScenario?.scenarioId === scenario.id;

                    return (
                      <div
                        key={scenario.id}
                        className={`bg-white dark:bg-gray-800/50 border rounded-lg p-4 ${isBest ? 'border-green-500/50 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900 dark:text-white">{scenario.name}</h4>
                          {isBest && (
                            <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-300 px-2 py-0.5 rounded">
                              Best Choice
                            </span>
                          )}
                        </div>

                        {scenario.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{scenario.description}</p>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Changes:</span>
                            <span className="text-gray-900 dark:text-white">{scenario.changes.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Paths Affected:</span>
                            <span className="text-gray-900 dark:text-white">{impact.pathsAffected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Country Pairs:</span>
                            <span className="text-gray-900 dark:text-white">{impact.countryPairsAffected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Avg Cost Delta:</span>
                            <span className={
                              impact.avgCostChange > 0 ? 'text-red-500 dark:text-red-400' :
                                impact.avgCostChange < 0 ? 'text-green-500 dark:text-green-400' : 'text-gray-900 dark:text-white'
                            }>
                              {impact.avgCostChange > 0 ? '+' : ''}{impact.avgCostChange.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Risk Score:</span>
                            <span className={
                              impact.riskScore >= 70 ? 'text-red-500 dark:text-red-400' :
                                impact.riskScore >= 40 ? 'text-yellow-500 dark:text-yellow-400' : 'text-green-500 dark:text-green-400'
                            }>
                              {impact.riskScore}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${impact.riskScore >= 70 ? 'bg-red-500' :
                                impact.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${impact.riskScore}%` }}
                          />
                        </div>

                        <button
                          onClick={() => { setActiveScenarioId(scenario.id); setShowComparison(false); }}
                          className="w-full mt-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm rounded-lg transition-all"
                        >
                          Edit Scenario
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfScenarioModal;
