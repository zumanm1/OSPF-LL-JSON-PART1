/**
 * Login Screen Component
 * Blocks access to the application until user authenticates
 * Features:
 * - Clean login form with validation
 * - Error display
 * - Usage counter display after login
 * - Loading states
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff, Shield, Server } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LoginScreen: React.FC = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
            Default credentials: admin / admin123
          </p>
          <p className={`text-center text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Change password after first login
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
