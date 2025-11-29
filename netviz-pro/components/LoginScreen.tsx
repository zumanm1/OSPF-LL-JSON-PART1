/**
 * Login Screen Component
 * Blocks access to the application until user authenticates
 * Features:
 * - Clean login form with validation
 * - Error display
 * - Usage counter display after login
 * - Loading states
 * - PIN-protected admin password reset
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff, Shield, Server, KeyRound, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Dynamic API URL
const getAuthApiUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:9041/api`;
};

const LoginScreen: React.FC = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!username.trim()) {
      setLocalError('Username is required');
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    const success = await login(username.trim(), password);

    if (!success) {
      // Error will be set by the context
    }
  };

  // Handle admin password reset with PIN
  const handleResetAdmin = async () => {
    if (!resetPin.trim()) {
      setResetError('PIN is required');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const response = await fetch(`${getAuthApiUrl()}/auth/reset-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPin.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'Reset failed');
        setResetLoading(false);
        return;
      }

      setResetSuccess(true);
      setResetLoading(false);

      // Close modal after showing success
      setTimeout(() => {
        setShowResetModal(false);
        setResetPin('');
        setResetSuccess(false);
        // Pre-fill username for convenience
        setUsername('admin');
        setPassword('');
      }, 2000);
    } catch (err) {
      setResetError('Failed to connect to server');
      setResetLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-100'
      }`}
    >
      <div
        className={`w-full max-w-md p-8 rounded-xl shadow-2xl ${
          isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'
            }`}
          >
            <Shield className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <h1
            className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            NetViz Pro
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            OSPF Network Topology Visualizer
          </p>
        </div>

        {/* Security Notice */}
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-6 text-sm ${
            isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
          }`}
        >
          <Server className="w-4 h-4 flex-shrink-0" />
          <span>Localhost access only - No external connections</span>
        </div>

        {/* Error Display */}
        {displayError && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${
              isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Username
            </label>
            <div className="relative">
              <div
                className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`block w-full pl-10 pr-3 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter username"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Password
            </label>
            <div className="relative">
              <div
                className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full pl-10 pr-12 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
              isLoading
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Use your assigned credentials to login
          </p>
          <p className={`text-center text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Contact your administrator if you need access
          </p>
          {/* Forgot Password Link */}
          <button
            type="button"
            onClick={() => {
              setShowResetModal(true);
              setResetPin('');
              setResetError(null);
              setResetSuccess(false);
            }}
            className={`mt-4 w-full text-center text-sm ${
              isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500'
            } transition-colors`}
          >
            Forgot Admin Password?
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !resetLoading && setShowResetModal(false)}
          />
          <div
            className={`relative w-full max-w-sm rounded-xl shadow-xl ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <KeyRound className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Reset Admin Password
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {resetSuccess ? (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <Check className="w-5 h-5" />
                  <span>Password reset to TempAdmin!2025. Please login.</span>
                </div>
              ) : (
                <>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Enter the security PIN to reset the admin password back to default.
                  </p>

                  {resetError && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
                    }`}>
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Security PIN
                    </label>
                    <input
                      type="password"
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value)}
                      placeholder="Enter 5-digit PIN"
                      maxLength={5}
                      className={`w-full px-3 py-2 rounded-lg border text-center text-lg tracking-widest ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      disabled={resetLoading}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      disabled={resetLoading}
                      className={`flex-1 py-2 px-4 rounded-lg ${
                        isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } disabled:opacity-50`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAdmin}
                      disabled={resetLoading || resetPin.length < 5}
                      className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-500 text-white flex items-center justify-center gap-2"
                    >
                      {resetLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Resetting...</span>
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
