/**
 * Web Worker Pool Manager
 * Manages a pool of path calculation workers for efficient parallel processing
 */

import type { WorkerMessage, WorkerResponse } from '../workers/pathCalculation.worker';
import type { NetworkNode, NetworkLink } from '../types';

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    message: WorkerMessage;
    resolve: (response: WorkerResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private poolSize: number;

  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    this.poolSize = Math.min(poolSize, 8); // Cap at 8 workers
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new Worker(
          new URL('../workers/pathCalculation.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error);
      }
    }

    console.log(`[WorkerPool] Initialized ${this.workers.length} workers`);
  }

  /**
   * Execute task with an available worker
   */
  private async executeTask(message: WorkerMessage): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();

      if (!worker) {
        // No workers available, queue the task
        this.taskQueue.push({ message, resolve, reject });
        return;
      }

      // Set timeout for long-running tasks
      const timeout = setTimeout(() => {
        reject(new Error('Worker task timed out after 30 seconds'));
        this.releaseWorker(worker);
      }, 30000);

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        clearTimeout(timeout);
        
        if (event.data.type === 'error') {
          reject(new Error(event.data.error || 'Worker task failed'));
        } else {
          resolve(event.data);
        }

        this.releaseWorker(worker);
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`Worker error: ${error.message}`));
        this.releaseWorker(worker);
      };

      worker.postMessage(message);
    });
  }

  /**
   * Release worker back to pool and process next queued task
   */
  private releaseWorker(worker: Worker) {
    if (this.taskQueue.length > 0) {
      // Process next queued task immediately
      const task = this.taskQueue.shift()!;
      this.executeTask(task.message).then(task.resolve).catch(task.reject);
    } else {
      // Return worker to available pool
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Calculate shortest path using worker
   */
  async calculateShortestPath(
    nodes: NetworkNode[],
    links: NetworkLink[],
    source: string,
    target: string
  ): Promise<number> {
    const response = await this.executeTask({
      type: 'shortestPath',
      data: { nodes, links, source, target }
    });

    return response.data.cost;
  }

  /**
   * Find all paths using worker
   */
  async findAllPaths(
    nodes: NetworkNode[],
    links: NetworkLink[],
    source: string,
    target: string,
    maxPaths: number = 5
  ): Promise<any[]> {
    const response = await this.executeTask({
      type: 'allPaths',
      data: { nodes, links, source, target, maxPaths }
    });

    return response.data.paths;
  }

  /**
   * Health check for workers
   */
  async healthCheck(): Promise<boolean[]> {
    const checks = this.workers.map(worker => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);
        
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          clearTimeout(timeout);
          resolve(event.data.type === 'pong');
        };

        worker.postMessage({ type: 'ping' });
      });
    });

    return Promise.all(checks);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.length - this.availableWorkers.length,
      queuedTasks: this.taskQueue.length
    };
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    console.log('[WorkerPool] All workers terminated');
  }
}

// Singleton instance
let workerPoolInstance: WorkerPool | null = null;

/**
 * Get or create worker pool instance
 */
export const getWorkerPool = (): WorkerPool => {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPool();
  }
  return workerPoolInstance;
};

/**
 * Terminate worker pool
 */
export const terminateWorkerPool = () => {
  if (workerPoolInstance) {
    workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
};
