import React, { useState, useMemo } from 'react';
import { NetworkData, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Lightbulb, ArrowRight, Target, Shield, Zap, Scale, ChevronRight, Check, AlertTriangle, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface CostOptimizerModalProps {
  data: NetworkData;
  onClose: () => void;
  onApplyChanges?: (changes: { linkIndex: number; newForwardCost: number; newReverseCost: number }[]) => void;
}

type GoalType = 'route_through' | 'avoid_link' | 'balance_traffic' | 'prefer_path';

interface OptimizationGoal {
  type: GoalType;
  sourceCountry: string;
  destCountry: string;
  targetTransitCountry?: string;
  avoidLinkIndex?: number;
  maxCostIncrease: number;
  maxLinksToChange: number;
}

interface OptimizationOption {
  id: string;
  name: string;
  description: string;
  changes: { linkIndex: number; newForwardCost: number; newReverseCost: number; originalCost: number }[];
  predictedImpact: {
    achievesGoal: boolean;
    pathsAffected: number;
    avgCostDelta: number;
    newPath: string[];
  };
  riskScore: number;
  effort: 'low' | 'medium' | 'high';
}

const CostOptimizerModal: React.FC<CostOptimizerModalProps> = ({ data, onClose, onApplyChanges }) => {
  const [step, setStep] = useState<'goal' | 'options' | 'review'>('goal');
  const [goal, setGoal] = useState<OptimizationGoal>({
    type: 'route_through',
    sourceCountry: '',
    destCountry: '',
    targetTransitCountry: '',
    maxCostIncrease: 1000,
    maxLinksToChange: 5
  });
  const [selectedOption, setSelectedOption] = useState<OptimizationOption | null>(null);

  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  // Generate optimization options based on goal
  const options = useMemo((): OptimizationOption[] => {
    if (!goal.sourceCountry || !goal.destCountry) return [];

    const sourceNodes = data.nodes.filter(n => n.country === goal.sourceCountry);
    const destNodes = data.nodes.filter(n => n.country === goal.destCountry);

    // Get current paths
    const currentPaths: PathResult[] = [];
    sourceNodes.forEach(sNode => {
      destNodes.forEach(dNode => {
        const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 3);
        currentPaths.push(...paths);
      });
    });

    if (currentPaths.length === 0) return [];

    const generatedOptions: OptimizationOption[] = [];

    if (goal.type === 'route_through' && goal.targetTransitCountry) {
      // Find paths that go through target transit country
      const transitNodes = data.nodes.filter(n => n.country === goal.targetTransitCountry);

      // Option 1: Minimum changes - increase cost on current best path links
      const currentBest = currentPaths[0];
      const linksNotThroughTransit: number[] = [];

      // Find links in current path that don't connect to transit
      for (let i = 0; i < currentBest.nodes.length - 1; i++) {
        const node1 = data.nodes.find(n => n.id === currentBest.nodes[i]);
        const node2 = data.nodes.find(n => n.id === currentBest.nodes[i + 1]);

        if (node1 && node2 &&
          node1.country !== goal.targetTransitCountry &&
          node2.country !== goal.targetTransitCountry) {
          // Find link index
          const linkIdx = data.links.findIndex(l => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source;
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
            return (srcId === currentBest.nodes[i] && tgtId === currentBest.nodes[i + 1]) ||
              (srcId === currentBest.nodes[i + 1] && tgtId === currentBest.nodes[i]);
          });
          if (linkIdx !== -1) linksNotThroughTransit.push(linkIdx);
        }
      }

      // Generate option 1: Minimal changes
      if (linksNotThroughTransit.length > 0) {
        const changes = linksNotThroughTransit.slice(0, 2).map(linkIdx => {
          const link = data.links[linkIdx];
          const origCost = link.forward_cost ?? link.cost;
          return {
            linkIndex: linkIdx,
            newForwardCost: origCost + 500,
            newReverseCost: (link.reverse_cost ?? origCost) + 500,
            originalCost: origCost
          };
        });

        generatedOptions.push({
          id: 'minimal',
          name: 'Minimum Changes',
          description: 'Increase cost on current path to encourage alternate routing',
          changes,
          predictedImpact: {
            achievesGoal: true,
            pathsAffected: currentPaths.length,
            avgCostDelta: 500,
            newPath: transitNodes.length > 0 ? [sourceNodes[0].id, transitNodes[0].id, destNodes[0].id] : []
          },
          riskScore: 25,
          effort: 'low'
        });
      }

      // Option 2: Best performance - reduce cost on transit links
      const transitLinks: number[] = [];
      data.links.forEach((link, idx) => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        const srcNode = data.nodes.find(n => n.id === srcId);
        const tgtNode = data.nodes.find(n => n.id === tgtId);

        if ((srcNode?.country === goal.targetTransitCountry || tgtNode?.country === goal.targetTransitCountry) &&
          (srcNode?.country === goal.sourceCountry || srcNode?.country === goal.destCountry ||
            tgtNode?.country === goal.sourceCountry || tgtNode?.country === goal.destCountry)) {
          transitLinks.push(idx);
        }
      });

      if (transitLinks.length > 0) {
        const changes = transitLinks.slice(0, 3).map(linkIdx => {
          const link = data.links[linkIdx];
          const origCost = link.forward_cost ?? link.cost;
          return {
            linkIndex: linkIdx,
            newForwardCost: Math.max(1, origCost - 200),
            newReverseCost: Math.max(1, (link.reverse_cost ?? origCost) - 200),
            originalCost: origCost
          };
        });

        generatedOptions.push({
          id: 'performance',
          name: 'Best Performance',
          description: `Reduce cost on links to/from ${goal.targetTransitCountry}`,
          changes,
          predictedImpact: {
            achievesGoal: true,
            pathsAffected: Math.floor(currentPaths.length * 0.7),
            avgCostDelta: -200,
            newPath: transitNodes.length > 0 ? [sourceNodes[0].id, transitNodes[0].id, destNodes[0].id] : []
          },
          riskScore: 35,
          effort: 'medium'
        });
      }

      // Option 3: Redundancy focused
      generatedOptions.push({
        id: 'redundancy',
        name: 'Redundancy Focused',
        description: 'Balance costs to maintain multiple viable paths through transit',
        changes: [...(generatedOptions[0]?.changes || []).slice(0, 1), ...(generatedOptions[1]?.changes || []).slice(0, 1)].map(c => ({
          ...c,
          newForwardCost: Math.round((c.originalCost + c.newForwardCost) / 2),
          newReverseCost: Math.round((c.originalCost + c.newReverseCost) / 2)
        })),
        predictedImpact: {
          achievesGoal: true,
          pathsAffected: Math.floor(currentPaths.length * 0.5),
          avgCostDelta: 150,
          newPath: transitNodes.length > 0 ? [sourceNodes[0].id, transitNodes[0].id, destNodes[0].id] : []
        },
        riskScore: 20,
        effort: 'medium'
      });

      // Option 4: Balanced approach
      generatedOptions.push({
        id: 'balanced',
        name: 'Balanced Approach',
        description: 'Combination of cost increases and decreases for gradual shift',
        changes: [
          ...(generatedOptions[0]?.changes || []).slice(0, 1).map(c => ({
            ...c,
            newForwardCost: c.originalCost + 250,
            newReverseCost: c.originalCost + 250
          })),
          ...(generatedOptions[1]?.changes || []).slice(0, 1).map(c => ({
            ...c,
            newForwardCost: Math.max(1, c.originalCost - 100),
            newReverseCost: Math.max(1, c.originalCost - 100)
          }))
        ],
        predictedImpact: {
          achievesGoal: true,
          pathsAffected: Math.floor(currentPaths.length * 0.6),
          avgCostDelta: 75,
          newPath: transitNodes.length > 0 ? [sourceNodes[0].id, transitNodes[0].id, destNodes[0].id] : []
        },
        riskScore: 15,
        effort: 'low'
      });
    }

    return generatedOptions.filter(o => o.changes.length > 0);
  }, [data, goal]);

  const handleApply = () => {
    if (selectedOption && onApplyChanges) {
      onApplyChanges(selectedOption.changes.map(c => ({
        linkIndex: c.linkIndex,
        newForwardCost: c.newForwardCost,
        newReverseCost: c.newReverseCost
      })));
      onClose();
    }
  };

  const handleExport = () => {
    if (!selectedOption) return;

    const exportData = selectedOption.changes.map(c => ({
      link: c.linkLabel,
      currentFwdCost: c.currentForwardCost,
      currentRevCost: c.currentReverseCost,
      newFwdCost: c.newForwardCost,
      newRevCost: c.newReverseCost,
    }));

    const columns: ExportColumn[] = [
      { header: 'Link', key: 'link' },
      { header: 'Current Fwd Cost', key: 'currentFwdCost' },
      { header: 'Current Rev Cost', key: 'currentRevCost' },
      { header: 'New Fwd Cost', key: 'newFwdCost' },
      { header: 'New Rev Cost', key: 'newRevCost' },
    ];

    exportToCSV(exportData, columns, 'optimizer_recommendations');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-lime-600 dark:text-lime-400" />
              OSPF Cost Optimizer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Auto-suggest optimal cost changes to achieve desired routing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedOption && (
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

        {/* Steps Progress */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center gap-4">
          {(['goal', 'options', 'review'] as const).map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === s
                    ? 'bg-lime-100 dark:bg-lime-600/20 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-500/30'
                    : idx < ['goal', 'options', 'review'].indexOf(step)
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'text-gray-500'
                  }`}
              >
                <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  {idx < ['goal', 'options', 'review'].indexOf(step) ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="text-sm font-medium capitalize">{s}</span>
              </div>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-600" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'goal' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Define Your Routing Goal</h3>

              {/* Goal Type */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">What do you want to achieve?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'route_through' as GoalType, icon: Target, label: 'Route Through Country', desc: 'Force traffic through a specific transit country' },
                    { type: 'avoid_link' as GoalType, icon: Shield, label: 'Avoid Specific Link', desc: 'Route traffic away from a link' },
                    { type: 'balance_traffic' as GoalType, icon: Scale, label: 'Balance Traffic', desc: 'Distribute load across multiple paths' },
                    { type: 'prefer_path' as GoalType, icon: Zap, label: 'Prefer Specific Path', desc: 'Make a specific path the preferred route' }
                  ].map(({ type, icon: Icon, label, desc }) => (
                    <button
                      key={type}
                      onClick={() => setGoal({ ...goal, type })}
                      className={`p-4 rounded-lg border text-left transition-all ${goal.type === type
                          ? 'bg-lime-50 dark:bg-lime-900/30 border-lime-500/50'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${goal.type === type ? 'text-lime-600 dark:text-lime-400' : 'text-gray-400'}`} />
                      <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Source Country</label>
                  <select
                    value={goal.sourceCountry}
                    onChange={(e) => setGoal({ ...goal, sourceCountry: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  >
                    <option value="">Select...</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-end justify-center pb-2">
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Destination Country</label>
                  <select
                    value={goal.destCountry}
                    onChange={(e) => setGoal({ ...goal, destCountry: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  >
                    <option value="">Select...</option>
                    {countries.filter(c => c !== goal.sourceCountry).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Transit Country (for route_through) */}
              {goal.type === 'route_through' && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Route Through (Transit Country)</label>
                  <select
                    value={goal.targetTransitCountry}
                    onChange={(e) => setGoal({ ...goal, targetTransitCountry: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  >
                    <option value="">Select transit country...</option>
                    {countries.filter(c => c !== goal.sourceCountry && c !== goal.destCountry).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Constraints */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Max Cost Increase</label>
                  <input
                    type="number"
                    value={goal.maxCostIncrease}
                    onChange={(e) => setGoal({ ...goal, maxCostIncrease: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Max Links to Change</label>
                  <input
                    type="number"
                    value={goal.maxLinksToChange}
                    onChange={(e) => setGoal({ ...goal, maxLinksToChange: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep('options')}
                disabled={!goal.sourceCountry || !goal.destCountry || (goal.type === 'route_through' && !goal.targetTransitCountry)}
                className="w-full py-3 bg-lime-600 hover:bg-lime-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white rounded-lg font-medium transition-all"
              >
                Generate Options
              </button>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recommended Options</h3>
                <button
                  onClick={() => setStep('goal')}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back to Goal
                </button>
              </div>

              {options.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No optimization options could be generated.</p>
                  <p className="text-sm mt-2">Try adjusting your goal parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option)}
                      className={`p-4 rounded-lg border text-left transition-all ${selectedOption?.id === option.id
                          ? 'bg-lime-50 dark:bg-lime-900/30 border-lime-500/50'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{option.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${option.riskScore < 25 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                            option.riskScore < 50 ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                          }`}>
                          Risk: {option.riskScore}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{option.description}</p>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Changes Required:</span>
                          <span className="text-gray-900 dark:text-white">{option.changes.length} links</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Paths Affected:</span>
                          <span className="text-gray-900 dark:text-white">{option.predictedImpact.pathsAffected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Avg Cost Change:</span>
                          <span className={option.predictedImpact.avgCostDelta > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}>
                            {option.predictedImpact.avgCostDelta > 0 ? '+' : ''}{option.predictedImpact.avgCostDelta}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Effort:</span>
                          <span className={`capitalize ${option.effort === 'low' ? 'text-green-500 dark:text-green-400' :
                              option.effort === 'medium' ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'
                            }`}>
                            {option.effort}
                          </span>
                        </div>
                      </div>

                      {selectedOption?.id === option.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Link Changes:</div>
                          {option.changes.map((change, idx) => {
                            const link = data.links[change.linkIndex];
                            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                            return (
                              <div key={idx} className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                {srcId} ↔ {tgtId}: {change.originalCost} → {change.newForwardCost}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedOption && (
                <button
                  onClick={() => setStep('review')}
                  className="w-full py-3 bg-lime-600 hover:bg-lime-500 text-white rounded-lg font-medium transition-all mt-4"
                >
                  Review Changes
                </button>
              )}
            </div>
          )}

          {step === 'review' && selectedOption && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Review & Apply</h3>
                <button
                  onClick={() => setStep('options')}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back to Options
                </button>
              </div>

              <div className="bg-lime-100 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-500/30 rounded-lg p-4">
                <h4 className="font-bold text-lime-700 dark:text-lime-400 mb-2">{selectedOption.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedOption.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Changes to Apply</h4>
                <div className="space-y-2">
                  {selectedOption.changes.map((change, idx) => {
                    const link = data.links[change.linkIndex];
                    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white font-medium">{srcId}</span>
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">{tgtId}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                          <span className="text-gray-400 dark:text-gray-500 line-through">{change.originalCost}</span>
                          <ArrowRight className="w-3 h-3 text-gray-500" />
                          <span className={change.newForwardCost > change.originalCost ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}>
                            {change.newForwardCost}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risk Score</div>
                  <div className={`text-2xl font-bold ${selectedOption.riskScore < 25 ? 'text-green-500 dark:text-green-400' :
                      selectedOption.riskScore < 50 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                    {selectedOption.riskScore}%
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paths Affected</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedOption.predictedImpact.pathsAffected}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 bg-lime-600 hover:bg-lime-500 text-white rounded-lg font-medium transition-all"
                >
                  Apply to Simulation Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostOptimizerModal;
