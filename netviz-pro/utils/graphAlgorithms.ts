import { NetworkNode, NetworkLink, PathResult } from '../types';

// Adjacency list type: NodeID -> Array of { targetId, cost, linkIndex }
type AdjacencyList = Map<string, Array<{ target: string; cost: number; linkIndex: number }>>;

const buildAdjacencyList = (nodes: NetworkNode[], links: NetworkLink[]): AdjacencyList => {
  const adj = new Map<string, Array<{ target: string; cost: number; linkIndex: number }>>();
  
  nodes.forEach(node => adj.set(node.id, []));

  links.forEach((link, index) => {
    const sourceId = typeof link.source === 'object' ? (link.source as NetworkNode).id : link.source as string;
    const targetId = typeof link.target === 'object' ? (link.target as NetworkNode).id : link.target as string;
    const cost = link.cost || 1;

    // Add Forward Edge
    if (adj.has(sourceId)) {
      adj.get(sourceId)?.push({ target: targetId, cost: link.cost, linkIndex: index });
    }

    // Add Reverse Edge (Assuming physical links are bidirectional for reachability)
    if (adj.has(targetId)) {
       const revCost = link.reverse_cost !== undefined ? link.reverse_cost : link.cost;
       adj.get(targetId)?.push({ target: sourceId, cost: revCost, linkIndex: index });
    }
  });

  return adj;
};

export const findShortestPathCost = (
  nodes: NetworkNode[],
  links: NetworkLink[],
  startNodeId: string,
  endNodeId: string
): number => {
  if (startNodeId === endNodeId) return 0;

  const adj = buildAdjacencyList(nodes, links);
  const costs = new Map<string, number>();
  const pq: { id: string; cost: number }[] = [];

  nodes.forEach(node => costs.set(node.id, Infinity));
  costs.set(startNodeId, 0);
  pq.push({ id: startNodeId, cost: 0 });

  while (pq.length > 0) {
    // Sort by cost (simulating priority queue)
    pq.sort((a, b) => a.cost - b.cost);
    const { id: currentId, cost: currentCost } = pq.shift()!;

    if (currentCost > (costs.get(currentId) || Infinity)) continue;
    if (currentId === endNodeId) return currentCost;

    const neighbors = adj.get(currentId) || [];
    for (const neighbor of neighbors) {
      const newCost = currentCost + neighbor.cost;
      if (newCost < (costs.get(neighbor.target) || Infinity)) {
        costs.set(neighbor.target, newCost);
        pq.push({ id: neighbor.target, cost: newCost });
      }
    }
  }

  return Infinity;
};

export const findAllPaths = (
  nodes: NetworkNode[],
  links: NetworkLink[],
  startNodeId: string,
  endNodeId: string,
  limit: number = 50
): PathResult[] => {
  const adj = buildAdjacencyList(nodes, links);
  const results: PathResult[] = [];
  
  // DFS State
  const stack: { 
    currentNode: string; 
    pathNodes: string[]; 
    pathLinks: number[]; 
    currentCost: number;
  }[] = [];

  stack.push({
    currentNode: startNodeId,
    pathNodes: [startNodeId],
    pathLinks: [],
    currentCost: 0
  });

  while (stack.length > 0) {
    const { currentNode, pathNodes, pathLinks, currentCost } = stack.pop()!;

    if (currentNode === endNodeId) {
      results.push({
        id: `${startNodeId}-${endNodeId}-${results.length}`,
        nodes: pathNodes,
        links: pathLinks,
        totalCost: currentCost,
        hopCount: pathNodes.length - 1
      });

      if (results.length >= limit) break;
      continue;
    }

    const neighbors = adj.get(currentNode) || [];
    
    // Sort neighbors by cost to explore cheaper paths first (greedy-ish DFS)
    neighbors.sort((a, b) => b.cost - a.cost); // Stack is LIFO, so push high cost first to pop low cost first

    for (const neighbor of neighbors) {
      // Avoid cycles
      if (!pathNodes.includes(neighbor.target)) {
        stack.push({
          currentNode: neighbor.target,
          pathNodes: [...pathNodes, neighbor.target],
          pathLinks: [...pathLinks, neighbor.linkIndex],
          currentCost: currentCost + neighbor.cost
        });
      }
    }
  }

  // Sort results by cost, then hop count
  return results.sort((a, b) => {
    if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
    return a.hopCount - b.hopCount;
  });
};