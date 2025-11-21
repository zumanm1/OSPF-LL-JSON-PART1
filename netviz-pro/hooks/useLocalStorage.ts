import { useState, useEffect } from 'react';

/**
 * Custom hook for localStorage persistence with automatic serialization/deserialization
 * @param key - localStorage key
 * @param initialValue - default value if nothing in storage
 * @returns [storedValue, setValue] tuple similar to useState
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Persist initial value to localStorage if not already there
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item === null) {
          // No value in storage, persist the initial/current value
          window.localStorage.setItem(key, JSON.stringify(storedValue));
        }
      } catch (error) {
        console.warn(`Error initializing localStorage key "${key}":`, error);
      }
    }
  }, []); // Run only once on mount

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Utility to clear specific localStorage keys
 */
export function clearLocalStorageKeys(keys: string[]): void {
  if (typeof window === 'undefined') return;
  
  keys.forEach(key => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  });
}

/**
 * Utility to get storage usage info
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, percentage: 0 };
  }

  try {
    let total = 0;
    for (let key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        total += window.localStorage[key].length + key.length;
      }
    }
    
    // Most browsers allow 5-10MB, we'll assume 5MB (5 * 1024 * 1024 bytes)
    const available = 5 * 1024 * 1024;
    const percentage = (total / available) * 100;
    
    return {
      used: total,
      available: available,
      percentage: Math.min(percentage, 100)
    };
  } catch (error) {
    console.error('Error calculating storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}
