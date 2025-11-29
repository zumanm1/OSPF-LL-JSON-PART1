/**
 * Unit Tests for Graph Algorithms
 * Tests Dijkstra shortest path and path finding with asymmetric routing
 */

import { describe, it, expect } from 'vitest';
import { findShortestPathCost, findAllPaths } from '../graphAlgorithms';
import { NetworkNode, NetworkLink } from '../../types';

describe('Graph Algorithms - Dijkstra Shortest Path', () => {
  // Test fixture: Simple 3-node network
  const simpleNodes: NetworkNode[] = [
    { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
    { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'USA', is_active: true, node_type: 'router' },
    { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'DEU', is_active: true, node_type: 'router' }
  ];

  it('should return 0 for same source and destination', () => {
    const links: NetworkLink[] = [];
    const cost = findShortestPathCost(simpleNodes, links, 'A', 'A');
    expect(cost).toBe(0);
  });

  it('should find direct path between two nodes', () => {
    const links: NetworkLink[] = [
      {
        source: 'A',
        target: 'B',
        forward_cost: 10,
        reverse_cost: 10,
        cost: 10,
        status: 'up',
        source_interface: 'Gi0/0',
        target_interface: 'Gi0/1'
      }
    ];
    const cost = findShortestPathCost(simpleNodes, links, 'A', 'B');
    expect(cost).toBe(10);
  });

  it('should find shortest path through intermediate node', () => {
    const links: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' },
      { source: 'B', target: 'C', forward_cost: 20, reverse_cost: 20, cost: 20, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3' }
    ];
    const cost = findShortestPathCost(simpleNodes, links, 'A', 'C');
    expect(cost).toBe(30); // A->B (10) + B->C (20) = 30
  });

  it('should choose cheaper path when multiple paths exist', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'DEU', is_active: true, node_type: 'router' },
      { id: 'D', name: 'D', hostname: 'RouterD', loopback_ip: '4.4.4.4', country: 'DEU', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = [
      // Direct expensive path A->D (cost 100)
      { source: 'A', target: 'D', forward_cost: 100, reverse_cost: 100, cost: 100, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' },
      // Cheaper path A->B->C->D (cost 10+10+10=30)
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3' },
      { source: 'B', target: 'C', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5' },
      { source: 'C', target: 'D', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/6', target_interface: 'Gi0/7' }
    ];

    const cost = findShortestPathCost(nodes, links, 'A', 'D');
    expect(cost).toBe(30); // Should choose cheaper path
  });

  it('should return Infinity for unreachable nodes', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'DEU', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' }
      // C is isolated
    ];

    const cost = findShortestPathCost(nodes, links, 'A', 'C');
    expect(cost).toBe(Infinity);
  });
});

describe('Graph Algorithms - Asymmetric Routing', () => {
  const nodes: NetworkNode[] = [
    { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
    { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' }
  ];

  it('should handle asymmetric costs correctly (A->B cheaper than B->A)', () => {
    const links: NetworkLink[] = [
      {
        source: 'A',
        target: 'B',
        forward_cost: 10,  // A->B cheap
        reverse_cost: 100, // B->A expensive
        cost: 10,
        status: 'up',
        source_interface: 'Gi0/0',
        target_interface: 'Gi0/1'
      }
    ];

    const costAtoB = findShortestPathCost(nodes, links, 'A', 'B');
    const costBtoA = findShortestPathCost(nodes, links, 'B', 'A');

    expect(costAtoB).toBe(10);  // Forward direction
    expect(costBtoA).toBe(100); // Reverse direction
  });

  it('should calculate different paths for asymmetric routing', () => {
    const asymNodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' },
      { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'GBR', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = [
      // Direct path A->B (expensive forward, cheap reverse)
      { source: 'A', target: 'B', forward_cost: 100, reverse_cost: 10, cost: 100, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' },
      // Via C (cheap forward, expensive reverse)
      { source: 'A', target: 'C', forward_cost: 20, reverse_cost: 80, cost: 20, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3' },
      { source: 'C', target: 'B', forward_cost: 20, reverse_cost: 80, cost: 20, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5' }
    ];

    // A->B: Direct (100) vs Via C (20+20=40) → Choose Via C
    const costAtoB = findShortestPathCost(asymNodes, links, 'A', 'B');
    expect(costAtoB).toBe(40);

    // B->A: Direct (10) vs Via C (80+80=160) → Choose Direct
    const costBtoA = findShortestPathCost(asymNodes, links, 'B', 'A');
    expect(costBtoA).toBe(10);
  });

  it('should fallback to symmetric cost when reverse_cost is undefined', () => {
    const links: NetworkLink[] = [
      {
        source: 'A',
        target: 'B',
        forward_cost: 50,
        // reverse_cost undefined → should fallback to forward_cost
        cost: 50,
        status: 'up',
        source_interface: 'Gi0/0',
        target_interface: 'Gi0/1'
      }
    ];

    const costAtoB = findShortestPathCost(nodes, links, 'A', 'B');
    const costBtoA = findShortestPathCost(nodes, links, 'B', 'A');

    expect(costAtoB).toBe(50);
    expect(costBtoA).toBe(50); // Should use forward_cost as fallback
  });

  it('should use legacy cost field when forward_cost is undefined', () => {
    const links: NetworkLink[] = [
      {
        source: 'A',
        target: 'B',
        // forward_cost undefined
        // reverse_cost undefined
        cost: 30, // Legacy field
        status: 'up',
        source_interface: 'Gi0/0',
        target_interface: 'Gi0/1'
      }
    ];

    const costAtoB = findShortestPathCost(nodes, links, 'A', 'B');
    const costBtoA = findShortestPathCost(nodes, links, 'B', 'A');

    expect(costAtoB).toBe(30);
    expect(costBtoA).toBe(30);
  });
});

describe('Graph Algorithms - Find All Paths', () => {
  const nodes: NetworkNode[] = [
    { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
    { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'USA', is_active: true, node_type: 'router' },
    { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'DEU', is_active: true, node_type: 'router' },
    { id: 'D', name: 'D', hostname: 'RouterD', loopback_ip: '4.4.4.4', country: 'DEU', is_active: true, node_type: 'router' }
  ];

  it('should find all possible paths between nodes', () => {
    const links: NetworkLink[] = [
      // Two paths: A->B->D and A->C->D
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1', index: 0 },
      { source: 'A', target: 'C', forward_cost: 15, reverse_cost: 15, cost: 15, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3', index: 1 },
      { source: 'B', target: 'D', forward_cost: 20, reverse_cost: 20, cost: 20, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5', index: 2 },
      { source: 'C', target: 'D', forward_cost: 25, reverse_cost: 25, cost: 25, status: 'up', source_interface: 'Gi0/6', target_interface: 'Gi0/7', index: 3 }
    ];

    const paths = findAllPaths(nodes, links, 'A', 'D', 10);

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.length).toBeLessThanOrEqual(2); // Two possible paths

    // Check that paths are sorted by cost
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i].totalCost).toBeGreaterThanOrEqual(paths[i - 1].totalCost);
    }

    // Verify cheapest path
    const cheapestPath = paths[0];
    expect(cheapestPath.nodes[0]).toBe('A');
    expect(cheapestPath.nodes[cheapestPath.nodes.length - 1]).toBe('D');
    expect(cheapestPath.totalCost).toBe(30); // A->B->D (10+20)
  });

  it('should limit number of paths returned', () => {
    const links: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1', index: 0 },
      { source: 'A', target: 'C', forward_cost: 15, reverse_cost: 15, cost: 15, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3', index: 1 },
      { source: 'B', target: 'D', forward_cost: 20, reverse_cost: 20, cost: 20, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5', index: 2 },
      { source: 'C', target: 'D', forward_cost: 25, reverse_cost: 25, cost: 25, status: 'up', source_interface: 'Gi0/6', target_interface: 'Gi0/7', index: 3 }
    ];

    const paths = findAllPaths(nodes, links, 'A', 'D', 1); // Limit to 1 path

    expect(paths.length).toBe(1);
  });

  it('should return empty array when no path exists', () => {
    const isolatedNodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = []; // No links

    const paths = findAllPaths(isolatedNodes, links, 'A', 'B', 10);

    expect(paths.length).toBe(0);
  });

  it('should not create cycles in paths', () => {
    const cyclicLinks: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1', index: 0 },
      { source: 'B', target: 'C', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3', index: 1 },
      { source: 'C', target: 'A', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5', index: 2 }, // Creates cycle
      { source: 'C', target: 'D', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/6', target_interface: 'Gi0/7', index: 3 }
    ];

    const paths = findAllPaths(nodes, cyclicLinks, 'A', 'D', 10);

    // Verify no path contains duplicate nodes (cycles)
    paths.forEach(path => {
      const uniqueNodes = new Set(path.nodes);
      expect(uniqueNodes.size).toBe(path.nodes.length);
    });
  });

  it('should include link indices in path results', () => {
    const links: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: 10, reverse_cost: 10, cost: 10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1', index: 99 },
      { source: 'B', target: 'C', forward_cost: 20, reverse_cost: 20, cost: 20, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3', index: 88 }
    ];

    const paths = findAllPaths(nodes, links, 'A', 'C', 5);

    expect(paths.length).toBeGreaterThan(0);
    const path = paths[0];
    expect(path.links).toContain(99);
    expect(path.links).toContain(88);
  });
});

describe('Graph Algorithms - Edge Cases', () => {
  it('should handle empty node list', () => {
    const cost = findShortestPathCost([], [], 'A', 'B');
    expect(cost).toBe(Infinity);
  });

  it('should handle empty link list', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' }
    ];

    const cost = findShortestPathCost(nodes, [], 'A', 'B');
    expect(cost).toBe(Infinity);
  });

  it('should handle node IDs with special characters', () => {
    const specialNodes: NetworkNode[] = [
      { id: 'usa-dc1-pe01', name: 'PE01', hostname: 'usa-dc1-pe01', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'deu-ber-pe02', name: 'PE02', hostname: 'deu-ber-pe02', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = [
      { source: 'usa-dc1-pe01', target: 'deu-ber-pe02', forward_cost: 50, reverse_cost: 50, cost: 50, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' }
    ];

    const cost = findShortestPathCost(specialNodes, links, 'usa-dc1-pe01', 'deu-ber-pe02');
    expect(cost).toBe(50);
  });

  it('should skip negative cost edges', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', hostname: 'RouterA', loopback_ip: '1.1.1.1', country: 'USA', is_active: true, node_type: 'router' },
      { id: 'B', name: 'B', hostname: 'RouterB', loopback_ip: '2.2.2.2', country: 'DEU', is_active: true, node_type: 'router' },
      { id: 'C', name: 'C', hostname: 'RouterC', loopback_ip: '3.3.3.3', country: 'GBR', is_active: true, node_type: 'router' }
    ];

    const links: NetworkLink[] = [
      { source: 'A', target: 'B', forward_cost: -10, reverse_cost: -10, cost: -10, status: 'up', source_interface: 'Gi0/0', target_interface: 'Gi0/1' }, // Invalid negative
      { source: 'A', target: 'C', forward_cost: 20, reverse_cost: 20, cost: 20, status: 'up', source_interface: 'Gi0/2', target_interface: 'Gi0/3' },
      { source: 'C', target: 'B', forward_cost: 30, reverse_cost: 30, cost: 30, status: 'up', source_interface: 'Gi0/4', target_interface: 'Gi0/5' }
    ];

    // Should skip negative edge and use valid path A->C->B
    const cost = findShortestPathCost(nodes, links, 'A', 'B');
    expect(cost).toBe(50); // A->C->B (20+30)
  });
});
