/**
 * Authentication Context for NetViz Pro
 * Features:
 * - Session management with JWT tokens
 * - Usage tracking with expiry
 * - Dynamic API URL based on current host
 * - Admin role support
 * - Keycloak SSO with PKCE
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { keycloak } from '../utils/keycloak';

// ============================================================================
// TYPES
// ============================================================================
export type AuthMode = 'legacy' | 'keycloak';

export interface User {
  id: number | string;
  username: string;
  role: 'admin' | 'user';
  maxUses?: number;
  currentUses?: number;
  usesRemaining?: number;
  expiryEnabled?: boolean;
  isExpired?: boolean;
  lastLogin?: string;
  mustChangePassword?: boolean;
  graceLoginsRemaining?: number;
  forcePasswordChange?: boolean;
  authSource?: 'legacy' | 'keycloak';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  authMode: AuthMode;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithKeycloak: () => void;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// API CONFIGURATION (USES GATEWAY PROXY)
// ============================================================================
// Use the gateway (same origin) which proxies /api requests to auth server
// This ensures cookies work correctly since it's same-origin
const AUTH_API_URL = '/api';

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
  const [authMode, setAuthMode] = useState<AuthMode>('legacy');

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

  // Initialize auth state - check Keycloak first, then session cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to initialize Keycloak
        const keycloakAvailable = await keycloak.init();

        if (keycloakAvailable && keycloak.isAuthenticated()) {
          // User is authenticated via Keycloak
          const userInfo = keycloak.getUserInfo();
          if (userInfo) {
            const keycloakToken = keycloak.getAccessToken();
            if (keycloakToken) setToken(keycloakToken);

            setUser({
              id: userInfo.id,
              username: userInfo.username,
              role: userInfo.roles[0] as 'admin' | 'user',
              authSource: 'keycloak',
            });
            setAuthMode('keycloak');
            setIsLoading(false);
            return;
          }
        }

        // Keycloak mode available but not authenticated
        if (keycloakAvailable) {
          setAuthMode('keycloak');
          setIsLoading(false);
          return;
        }

        // Fall back to legacy session validation
        const response = await fetch(`${AUTH_API_URL}/auth/validate`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setToken(data.token || null);
          setUser(data.user ? { ...data.user, authSource: 'legacy' } : null);
        } else if (response.status === 401) {
          setToken(null);
          setUser(null);
        }
        setAuthMode('legacy');
      } catch (err) {
        console.error('[Auth] Failed to validate session:', err);
        setToken(null);
        setUser(null);
        setAuthMode('legacy');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    // In Keycloak mode, redirect to Keycloak login instead
    if (authMode === 'keycloak') {
      setError('Use Keycloak login in this mode');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (data.success) {
        setToken(data.token);
        setUser({ ...data.user, authSource: 'legacy' });

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

  // Login with Keycloak SSO
  const loginWithKeycloak = () => {
    if (keycloak.isAvailable()) {
      keycloak.login();
    } else {
      console.error('[Auth] Keycloak is not available');
    }
  };

  // Logout function
  const logout = async () => {
    // Handle Keycloak logout
    if (authMode === 'keycloak' && user?.authSource === 'keycloak') {
      keycloak.logout();
      return; // Keycloak will redirect
    }

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
        authMode,
        login,
        loginWithKeycloak,
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
