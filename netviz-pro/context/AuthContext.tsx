/**
 * Authentication Context for NetViz Pro
 * Features:
 * - Session management with JWT tokens
 * - Usage tracking with expiry
 * - Dynamic API URL based on current host
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
  mustChangePassword?: boolean;
  graceLoginsRemaining?: number;
  forcePasswordChange?: boolean;
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
// API CONFIGURATION (DYNAMIC - USES CURRENT HOST)
// ============================================================================
// Use the same hostname as the current page, but on port 9041 for auth API
const getAuthApiUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:9041/api`;
};

const AUTH_API_URL = getAuthApiUrl();

// ============================================================================
// CONTEXT
// ============================================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        headers,
        credentials: 'include'
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

  // Initialize auth state from session cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await fetch(`${AUTH_API_URL}/auth/validate`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setToken(data.token || null);
          setUser(data.user || null);
        } else if (response.status === 401) {
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[Auth] Failed to validate session:', err);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
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

      // After successful password change, update user state to clear mustChangePassword
      if (user) {
        const updatedUser = {
          ...user,
          mustChangePassword: false,
          graceLoginsRemaining: 10,
          forcePasswordChange: false
        };
        setUser(updatedUser);
      }

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
