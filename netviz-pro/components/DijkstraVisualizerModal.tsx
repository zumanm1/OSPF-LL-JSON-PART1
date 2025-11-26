import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { NetworkData, NetworkNode, NetworkLink } from '../types';
import { X, Play, Pause, SkipForward, RotateCcw, ChevronRight, Target, MapPin, Zap, ArrowLeftRight, AlertTriangle, ArrowUpDown, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface DijkstraVisualizerModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface DijkstraStep {
  stepNumber: number;
  currentNode: string;
  distances: Map<string, number>;
  visited: Set<string>;
  priorityQueue: { node: string; distance: number }[];
  previousNode: Map<string, string>;
  description: string;
  phase: 'init' | 'process' | 'complete';
  edgeBeingRelaxed?: { from: string; to: string };
}

const DijkstraVisualizerModal: React.FC<DijkstraVisualizerModalProps> = ({ data, onClose }) => {
  const [sourceNode, setSourceNode] = useState<string>('');
  const [destNode, setDestNode] = useState<string>('');
  const [steps, setSteps] = useState<DijkstraStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [hasStarted, setHasStarted] = useState(false);
  const [showReverseComparison, setShowReverseComparison] = useState(false);
  const [reversePathCost, setReversePathCost] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const speedMs = { slow: 1500, medium: 800, fast: 300 };

  // Build adjacency list from links
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, { neighbor: string; cost: number }[]>();

    data.nodes.forEach(node => {
      adj.set(node.id, []);
    });

    data.links.forEach(link => {
      if (link.status !== 'up') return;

      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const forwardCost = link.forward_cost ?? link.cost;
      const reverseCost = link.reverse_cost ?? forwardCost;

      adj.get(sourceId)?.push({ neighbor: targetId, cost: forwardCost });
      adj.get(targetId)?.push({ neighbor: sourceId, cost: reverseCost });
    });

    return adj;
  }, [data]);

  // Generate Dijkstra steps
  const generateSteps = useCallback(() => {
    if (!sourceNode || !destNode) return;

    const allSteps: DijkstraStep[] = [];
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const pq: { node: string; distance: number }[] = [];

    // Initialize distances
    data.nodes.forEach(node => {
      distances.set(node.id, Infinity);
    });
    distances.set(sourceNode, 0);
    pq.push({ node: sourceNode, distance: 0 });

    // Initial step
    allSteps.push({
      stepNumber: 0,
      currentNode: sourceNode,
      distances: new Map(distances),
      visited: new Set(visited),
      priorityQueue: [...pq],
      previousNode: new Map(previous),
      description: `Initialized: Source node ${sourceNode} has distance 0. All other nodes have distance ∞.`,
      phase: 'init'
    });

    let stepCount = 1;
    let found = false;

    while (pq.length > 0 && !found) {
      // Sort priority queue
      pq.sort((a, b) => a.distance - b.distance);
      const current = pq.shift()!;

      if (visited.has(current.node)) continue;
      visited.add(current.node);

      // Check if we reached destination
      if (current.node === destNode) {
        allSteps.push({
          stepNumber: stepCount++,
          currentNode: current.node,
          distances: new Map(distances),
          visited: new Set(visited),
          priorityQueue: [...pq],
          previousNode: new Map(previous),
          description: `🎉 Destination ${destNode} reached! Final shortest distance: ${current.distance}`,
          phase: 'complete'
        });
        found = true;
        break;
      }

      // Record visiting step
      allSteps.push({
        stepNumber: stepCount++,
        currentNode: current.node,
        distances: new Map(distances),
        visited: new Set(visited),
        priorityQueue: [...pq],
        previousNode: new Map(previous),
        description: `Processing node ${current.node} with distance ${current.distance}. Marking as visited.`,
        phase: 'process'
      });

      // Process neighbors
      const neighbors = adjacencyList.get(current.node) || [];
      for (const { neighbor, cost } of neighbors) {
        if (visited.has(neighbor)) continue;

        const newDist = current.distance + cost;
        const oldDist = distances.get(neighbor) || Infinity;

        if (newDist < oldDist) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, current.node);
          pq.push({ node: neighbor, distance: newDist });

          allSteps.push({
            stepNumber: stepCount++,
            currentNode: current.node,
            distances: new Map(distances),
            visited: new Set(visited),
            priorityQueue: [...pq].sort((a, b) => a.distance - b.distance),
            previousNode: new Map(previous),
            description: `Edge relaxation: ${current.node} → ${neighbor}. Cost ${cost}. New distance to ${neighbor}: ${newDist} (was ${oldDist === Infinity ? '∞' : oldDist})`,
            phase: 'process',
            edgeBeingRelaxed: { from: current.node, to: neighbor }
          });
        }
      }
    }

    if (!found) {
      allSteps.push({
        stepNumber: stepCount,
        currentNode: '',
        distances: new Map(distances),
        visited: new Set(visited),
        priorityQueue: [],
        previousNode: new Map(previous),
        description: `No path found from ${sourceNode} to ${destNode}. The destination is unreachable.`,
        phase: 'complete'
      });
    }

    setSteps(allSteps);
    setCurrentStepIndex(0);
    setHasStarted(true);
    setIsPlaying(false);

    // Calculate reverse path cost if comparison is enabled
    if (showReverseComparison) {
      calculateReverseCost();
    }
  }, [sourceNode, destNode, adjacencyList, data.nodes]);

  // Calculate the reverse path cost (B→A)
  const calculateReverseCost = useCallback(() => {
    if (!sourceNode || !destNode) {
      setReversePathCost(null);
      return;
    }

    const distances = new Map<string, number>();
    const visited = new Set<string>();
    const pq: { node: string; distance: number }[] = [];

    // Initialize - note: we're going from destNode to sourceNode
    data.nodes.forEach(node => {
      distances.set(node.id, Infinity);
    });
    distances.set(destNode, 0);
    pq.push({ node: destNode, distance: 0 });

    while (pq.length > 0) {
      pq.sort((a, b) => a.distance - b.distance);
      const current = pq.shift()!;

      if (visited.has(current.node)) continue;
      visited.add(current.node);

      if (current.node === sourceNode) {
        setReversePathCost(current.distance);
        return;
      }

      const neighbors = adjacencyList.get(current.node) || [];
      for (const { neighbor, cost } of neighbors) {
        if (visited.has(neighbor)) continue;

        const newDist = current.distance + cost;
        if (newDist < (distances.get(neighbor) || Infinity)) {
          distances.set(neighbor, newDist);
          pq.push({ node: neighbor, distance: newDist });
        }
      }
    }

    setReversePathCost(null); // No path found
  }, [sourceNode, destNode, adjacencyList, data.nodes]);

  // Swap source and destination
  const handleSwap = () => {
    const temp = sourceNode;
    setSourceNode(destNode);
    setDestNode(temp);
    setHasStarted(false);
    setReversePathCost(null);
  };

  // Effect to calculate reverse cost when toggle is enabled
  useEffect(() => {
    if (showReverseComparison && hasStarted) {
      calculateReverseCost();
    }
  }, [showReverseComparison, hasStarted, calculateReverseCost]);

  // Get the final path
  const finalPath = useMemo(() => {
    if (steps.length === 0) return [];
    const lastStep = steps[steps.length - 1];
    if (lastStep.phase !== 'complete') return [];

    const path: string[] = [];
    let current = destNode;

    while (current && lastStep.previousNode.has(current)) {
      path.unshift(current);
      current = lastStep.previousNode.get(current)!;
    }
    if (current === sourceNode) {
      path.unshift(sourceNode);
    }

    return path;
  }, [steps, sourceNode, destNode]);

  // Playback controls
  useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length - 1) {
      intervalRef.current = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, speedMs[speed]);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps.length, speed]);

  const togglePlay = () => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const currentStep = steps[currentStepIndex];

  // Node status helper
  const getNodeStatus = (nodeId: string) => {
    if (!currentStep) return 'default';
    if (currentStep.currentNode === nodeId) return 'current';
    if (currentStep.visited.has(nodeId)) return 'visited';
    if (currentStep.priorityQueue.some(pq => pq.node === nodeId)) return 'queued';
    return 'default';
  };

  const handleExport = () => {
    if (!currentStep || currentStep.phase !== 'complete') return;

    // Reconstruct the shortest path from previousNode map
    const path: string[] = [];
    let current = destNode;
    while (current) {
      path.unshift(current);
      const prev = currentStep.previousNode.get(current);
      if (!prev || prev === sourceNode) {
        if (prev === sourceNode) path.unshift(sourceNode);
        break;
      }
      current = prev;
    }

    const exportData = data.nodes.map(node => ({
      node: node.id,
      country: node.country,
      distanceFromSource: currentStep.distances.get(node.id) ?? Infinity,
      previousNode: currentStep.previousNode.get(node.id) || 'N/A',
      isInPath: path.includes(node.id) ? 'Yes' : 'No',
    }));

    const columns: ExportColumn[] = [
      { header: 'Node', key: 'node' },
      { header: 'Country', key: 'country' },
      { header: 'Distance from Source', key: 'distanceFromSource' },
      { header: 'Previous Node', key: 'previousNode' },
      { header: 'In Shortest Path', key: 'isInPath' },
    ];

    exportToCSV(exportData, columns, `dijkstra_${sourceNode}_to_${destNode}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
              Dijkstra Algorithm Visualizer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Step-by-step visualization of shortest path calculation
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentStep?.phase === 'complete' && (
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

        {/* Node Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Source:</span>
            <select
              value={sourceNode}
              onChange={(e) => { setSourceNode(e.target.value); setHasStarted(false); setReversePathCost(null); }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select source...</option>
              {data.nodes.map(node => (
                <option key={node.id} value={node.id}>{node.id} ({node.country})</option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!sourceNode && !destNode}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Swap source and destination"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Destination:</span>
            <select
              value={destNode}
              onChange={(e) => { setDestNode(e.target.value); setHasStarted(false); setReversePathCost(null); }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select destination...</option>
              {data.nodes.filter(n => n.id !== sourceNode).map(node => (
                <option key={node.id} value={node.id}>{node.id} ({node.country})</option>
              ))}
            </select>
          </div>

          <button
            onClick={generateSteps}
            disabled={!sourceNode || !destNode}
            className="flex items-center gap-2 px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Zap className="w-4 h-4" />
            {hasStarted ? 'Restart' : 'Start'}
          </button>

          {/* Compare Reverse Toggle */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Compare Reverse</span>
            <button
              onClick={() => setShowReverseComparison(!showReverseComparison)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                showReverseComparison ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                showReverseComparison ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex-1" />

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Speed:</span>
            {(['slow', 'medium', 'fast'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs transition-all ${speed === s
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {!hasStarted ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Select source and destination nodes to visualize Dijkstra's algorithm</p>
              </div>
            </div>
          ) : (
            <>
              {/* Node Grid */}
              <div className="flex-1 overflow-auto p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Node Distances</h3>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {data.nodes.map(node => {
                    const status = getNodeStatus(node.id);
                    const distance = currentStep?.distances.get(node.id);
                    const isInPath = finalPath.includes(node.id) && currentStep?.phase === 'complete';

                    return (
                      <div
                        key={node.id}
                        className={`p-2 rounded-lg border text-center transition-all ${isInPath ? 'bg-green-900/50 border-green-500 ring-2 ring-green-500' :
                          status === 'current' ? 'bg-yellow-900/50 border-yellow-500 ring-2 ring-yellow-500' :
                            status === 'visited' ? 'bg-blue-900/50 border-blue-500' :
                              status === 'queued' ? 'bg-purple-900/30 border-purple-500/50' :
                                'bg-gray-800/50 border-gray-700'
                          }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COUNTRY_COLORS[node.country] || '#6b7280' }}
                          />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">{node.id}</span>
                        </div>
                        <div className={`text-sm font-bold ${distance === 0 ? 'text-green-500 dark:text-green-400' :
                          distance === Infinity ? 'text-gray-500' :
                            'text-gray-900 dark:text-white'
                          }`}>
                          {distance === Infinity ? '∞' : distance}
                        </div>
                        <div className="text-[10px] text-gray-500">{node.country}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Final Path Display */}
                {currentStep?.phase === 'complete' && finalPath.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Shortest Path Found</h3>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {finalPath.map((nodeId, idx) => {
                          const node = data.nodes.find(n => n.id === nodeId);
                          return (
                            <React.Fragment key={nodeId}>
                              <span className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-200 font-medium flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COUNTRY_COLORS[node?.country || ''] || '#6b7280' }}
                                />
                                {nodeId}
                              </span>
                              {idx < finalPath.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-green-500" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                        Total Cost: <span className="font-bold">{currentStep.distances.get(destNode)}</span>
                        <span className="text-green-600 dark:text-green-400/70 ml-2">• {finalPath.length - 1} hops</span>
                      </div>
                    </div>

                    {/* Reverse Path Comparison */}
                    {showReverseComparison && reversePathCost !== null && (
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Bidirectional Cost Comparison</h3>
                        {(() => {
                          const forwardCost = currentStep.distances.get(destNode) || 0;
                          const isAsymmetric = forwardCost !== reversePathCost;
                          const difference = Math.abs(forwardCost - reversePathCost);
                          const ratio = forwardCost > 0 ? reversePathCost / forwardCost : 1;
                          const higherDirection = forwardCost > reversePathCost ? 'forward' : 'reverse';

                          return (
                            <div className={`p-4 rounded-lg border ${
                              isAsymmetric
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30'
                            }`}>
                              {isAsymmetric && (
                                <div className="flex items-center gap-2 mb-3">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    Asymmetric Routing Detected
                                  </span>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <div className={`p-3 rounded-lg ${
                                  higherDirection === 'forward' && isAsymmetric
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-white dark:bg-gray-800/50'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Forward</span>
                                    <span className="text-xs text-gray-400">({sourceNode} → {destNode})</span>
                                  </div>
                                  <span className={`text-2xl font-bold ${
                                    higherDirection === 'forward' && isAsymmetric
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {forwardCost}
                                  </span>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                  higherDirection === 'reverse' && isAsymmetric
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-white dark:bg-gray-800/50'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Reverse</span>
                                    <span className="text-xs text-gray-400">({destNode} → {sourceNode})</span>
                                  </div>
                                  <span className={`text-2xl font-bold ${
                                    higherDirection === 'reverse' && isAsymmetric
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {reversePathCost}
                                  </span>
                                </div>
                              </div>
                              {isAsymmetric && (
                                <div className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                                  Difference: <span className="font-bold">{difference}</span> |
                                  Ratio: <span className="font-bold">{ratio.toFixed(2)}x</span>
                                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-500">
                                    ({higherDirection === 'forward' ? 'Forward' : 'Reverse'} is more expensive)
                                  </span>
                                </div>
                              )}
                              {!isAsymmetric && (
                                <div className="mt-3 text-sm text-blue-700 dark:text-blue-400">
                                  ✓ Symmetric routing - both directions have equal cost
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel - Algorithm State */}
              <div className="w-80 border-l border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
                {/* Step Description */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Current Step</h4>
                  <div className={`p-3 rounded-lg border ${currentStep?.phase === 'complete' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' :
                    currentStep?.phase === 'process' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                        Step {currentStep?.stepNumber || 0}
                      </span>
                      {currentStep?.currentNode && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          @ {currentStep.currentNode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{currentStep?.description}</p>
                  </div>
                </div>

                {/* Priority Queue */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Priority Queue</h4>
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {currentStep?.priorityQueue.length === 0 ? (
                      <span className="text-xs text-gray-500">Empty</span>
                    ) : (
                      <div className="space-y-1">
                        {currentStep?.priorityQueue.slice(0, 10).map((item, idx) => (
                          <div
                            key={`${item.node}-${idx}`}
                            className={`flex items-center justify-between px-2 py-1 rounded text-xs ${idx === 0 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                              }`}
                          >
                            <span>{item.node}</span>
                            <span className="text-gray-400">{item.distance}</span>
                          </div>
                        ))}
                        {(currentStep?.priorityQueue.length || 0) > 10 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{(currentStep?.priorityQueue.length || 0) - 10} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visited Nodes */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Visited ({currentStep?.visited.size || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(currentStep?.visited || []).map(nodeId => (
                      <span
                        key={nodeId}
                        className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      >
                        {nodeId}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-yellow-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Current Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-blue-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Visited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-purple-500/50 border border-purple-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">In Queue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-green-500"></span>
                      <span className="text-gray-700 dark:text-gray-300">Final Path</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Playback Controls */}
        {hasStarted && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className={`p-3 rounded-lg transition-all ${isPlaying
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={stepForward}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Step Forward"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Progress Bar */}
            <div className="flex-1 max-w-md">
              <div className="bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full transition-all duration-200"
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DijkstraVisualizerModal;
