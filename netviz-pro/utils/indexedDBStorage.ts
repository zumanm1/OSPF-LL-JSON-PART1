/**
 * IndexedDB Storage Utility
 * Handles large topology data storage more efficiently than localStorage
 * 
 * Benefits:
 * - No 5-10MB localStorage limit
 * - Better performance for large datasets
 * - Asynchronous operations
 * - Structured data storage
 */

const DB_NAME = 'NetVizProDB';
const DB_VERSION = 1;
const STORE_NAME = 'topologies';

export interface TopologyData {
  id: string;
  name: string;
  timestamp: number;
  data: any; // The actual topology JSON
  size: number; // Size in bytes
}

/**
 * Initialize IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('name', 'name', { unique: false });
      }
    };
  });
};

/**
 * Save topology to IndexedDB
 */
export const saveTopology = async (
  id: string,
  name: string,
  data: any
): Promise<void> => {
  const db = await openDB();
  
  const topology: TopologyData = {
    id,
    name,
    timestamp: Date.now(),
    data,
    size: JSON.stringify(data).length
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put(topology);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
};

/**
 * Load topology from IndexedDB
 */
export const loadTopology = async (id: string): Promise<TopologyData | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
};

/**
 * Get all saved topologies
 */
export const getAllTopologies = async (): Promise<TopologyData[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
};

/**
 * Delete topology from IndexedDB
 */
export const deleteTopology = async (id: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
};

/**
 * Clear all topologies
 */
export const clearAllTopologies = async (): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
};

/**
 * Fallback to localStorage for small data
 * Automatically uses IndexedDB for data > 1MB
 */
export const smartSave = async (key: string, data: any): Promise<void> => {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = jsonString.length;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Use localStorage for small data (< 1MB)
  if (sizeInMB < 1) {
    try {
      localStorage.setItem(key, jsonString);
      return;
    } catch (e) {
      // If localStorage fails, fall through to IndexedDB
      console.warn('localStorage failed, using IndexedDB:', e);
    }
  }

  // Use IndexedDB for large data
  await saveTopology(key, key, data);
};

/**
 * Smart load - checks both localStorage and IndexedDB
 */
export const smartLoad = async (key: string): Promise<any | null> => {
  // Try localStorage first (faster for small data)
  try {
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (e) {
    console.warn('localStorage read failed:', e);
  }

  // Try IndexedDB
  try {
    const topology = await loadTopology(key);
    return topology ? topology.data : null;
  } catch (e) {
    console.error('IndexedDB read failed:', e);
    return null;
  }
};

/**
 * Get storage stats
 */
export const getStorageStats = async (): Promise<{
  topologyCount: number;
  totalSize: number;
  topologies: Array<{ id: string; name: string; size: number; timestamp: number }>;
}> => {
  const topologies = await getAllTopologies();
  const totalSize = topologies.reduce((sum, t) => sum + t.size, 0);

  return {
    topologyCount: topologies.length,
    totalSize,
    topologies: topologies.map(t => ({
      id: t.id,
      name: t.name,
      size: t.size,
      timestamp: t.timestamp
    }))
  };
};
