/**
 * Authentication Context for NetViz Pro
 * Features:
 * - Session management with JWT tokens
 * - Usage tracking with expiry
 * - Localhost-only API calls
 * - Admin role support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  maxUses: number;
  currentUses: number;
  usesRemaining: number;
  expiryEnabled: boolean;
  isExpired: boolean;
  lastLogin?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// API CONFIGURATION (LOCALHOST ONLY)
// ============================================================================
const AUTH_API_URL = 'http://127.0.0.1:9041/api';

// ============================================================================
// CONTEXT
// ============================================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  TOKEN: 'netviz_auth_token',
  USER: 'netviz_auth_user'
};

// ============================================================================
// PROVIDER
// ============================================================================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Check if authenticated
  const isAuthenticated = !!token && !!user && !user.isExpired;

  // API call helper with auth header
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Auth server not available. Please ensure the server is running.');
      }
      throw err;
    }
  }, [token]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        try {
          // Validate token with server
          const response = await fetch(`${AUTH_API_URL}/auth/validate`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setToken(storedToken);
            setUser(data.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
          }
        } catch (err) {
          // Server not available or error
          console.error('[Auth] Failed to validate session:', err);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (data.success) {
        setToken(data.token);
        setUser(data.user);

        // Store in localStorage
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

        return true;
      } else {
        setError(data.error || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await apiCall('/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    } finally {
      // Clear state regardless of API call result
      setToken(null);
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  };

  // Change password
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiCall('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      return { success: false, error: errorMessage };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!token) return;

    try {
      const data = await apiCall('/auth/me');
      setUser(data);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data));
    } catch (err) {
      console.error('[Auth] Failed to refresh user:', err);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        isAdmin,
        error,
        login,
        logout,
        changePassword,
        refreshUser,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
