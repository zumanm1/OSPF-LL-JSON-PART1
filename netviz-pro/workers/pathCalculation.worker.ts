/**
 * Web Worker for Heavy Path Calculations
 * Offloads intensive graph algorithm computations to prevent UI blocking
 */

import { findShortestPathCost, findAllPaths } from '../utils/graphAlgorithms';
import type { NetworkNode, NetworkLink } from '../types';

export interface WorkerMessage {
  type: 'shortestPath' | 'allPaths' | 'ping';
  data?: {
    nodes: NetworkNode[];
    links: NetworkLink[];
    source: string;
    target: string;
    maxPaths?: number;
  };
}

export interface WorkerResponse {
  type: 'shortestPath' | 'allPaths' | 'pong' | 'error';
  data?: any;
  error?: string;
  executionTime?: number;
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const startTime = performance.now();
  const { type, data } = event.message;

  try {
    switch (type) {
      case 'ping':
        // Health check
        self.postMessage({
          type: 'pong',
          executionTime: performance.now() - startTime
        } as WorkerResponse);
        break;

      case 'shortestPath':
        if (!data) throw new Error('Missing data for shortestPath calculation');
        
        const cost = findShortestPathCost(
          data.nodes,
          data.links,
          data.source,
          data.target
        );

        self.postMessage({
          type: 'shortestPath',
          data: { cost },
          executionTime: performance.now() - startTime
        } as WorkerResponse);
        break;

      case 'allPaths':
        if (!data) throw new Error('Missing data for allPaths calculation');
        
        const paths = findAllPaths(
          data.nodes,
          data.links,
          data.source,
          data.target,
          data.maxPaths || 5
        );

        self.postMessage({
          type: 'allPaths',
          data: { paths },
          executionTime: performance.now() - startTime
        } as WorkerResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      executionTime: performance.now() - startTime
    } as WorkerResponse);
  }
};

// Export empty object for TypeScript module compatibility
export {};
