/**
 * Mock Authentication Module for Testing
 * Avoids dependency on running auth server during unit tests
 */

import { vi } from 'vitest';

export interface MockAuthResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    role: string;
  };
  error?: string;
}

/**
 * Mock fetch responses for auth endpoints
 */
export const mockAuthFetch = () => {
  global.fetch = vi.fn((url: string, options?: RequestInit) => {
    const urlStr = url.toString();
    
    // Mock login endpoint
    if (urlStr.includes('/api/auth/login')) {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      
      if (body.username === 'admin' && body.password === 'admin123') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            token: 'mock-jwt-token-12345',
            user: {
              username: 'admin',
              role: 'admin'
            }
          })
        } as Response);
      }
      
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Invalid credentials'
        })
      } as Response);
    }
    
    // Mock verify endpoint
    if (urlStr.includes('/api/auth/verify')) {
      const authHeader = options?.headers?.['Authorization'] || options?.headers?.['authorization'];
      
      if (authHeader === 'Bearer mock-jwt-token-12345') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            user: {
              username: 'admin',
              role: 'admin'
            }
          })
        } as Response);
      }
      
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Invalid token'
        })
      } as Response);
    }
    
    // Mock logout endpoint
    if (urlStr.includes('/api/auth/logout')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true
        })
      } as Response);
    }
    
    // Default: return 404
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'Not found'
      })
    } as Response);
  }) as any;
};

/**
 * Mock localStorage for token storage
 */
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  
  global.localStorage = {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    length: Object.keys(storage).length
  };
};

/**
 * Setup complete auth mocking environment
 */
export const setupAuthMocks = () => {
  mockAuthFetch();
  mockLocalStorage();
};

/**
 * Cleanup auth mocks
 */
export const cleanupAuthMocks = () => {
  vi.restoreAllMocks();
};

/**
 * Helper to simulate logged-in state
 */
export const setMockLoggedIn = () => {
  localStorage.setItem('authToken', 'mock-jwt-token-12345');
  localStorage.setItem('user', JSON.stringify({
    username: 'admin',
    role: 'admin'
  }));
};

/**
 * Helper to simulate logged-out state
 */
export const setMockLoggedOut = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};
