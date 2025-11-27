/**
 * User Status Bar Component
 * Shows current user info, usage counter, and logout button
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, LogOut, Shield, AlertTriangle, Settings, Key } from 'lucide-react';

interface UserStatusBarProps {
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
}

const UserStatusBar: React.FC<UserStatusBarProps> = ({ onOpenAdmin, onOpenSettings }) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const usagePercentage = user.expiryEnabled && user.maxUses > 0
    ? Math.round((user.currentUses / user.maxUses) * 100)
    : 0;

  const isLowUses = user.expiryEnabled && user.usesRemaining <= 3 && user.usesRemaining > 0;
  const isExpiringSoon = usagePercentage >= 80;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
        }`}
      >
        {isAdmin ? (
          <Shield className="w-4 h-4 text-purple-500" />
        ) : (
          <User className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{user.username}</span>
        {user.expiryEnabled && !isAdmin && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isExpiringSoon
              ? isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
              : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
          }`}>
            {user.usesRemaining === -1 ? '∞' : user.usesRemaining} left
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div
            className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl z-50 ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            {/* User Info */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  isAdmin
                    ? isDark ? 'bg-purple-900/50' : 'bg-purple-100'
                    : isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {isAdmin ? (
                    <Shield className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  ) : (
                    <User className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  )}
                </div>
                <div>
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {user.username}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isAdmin ? 'Administrator' : 'User'}
                  </div>
                </div>
              </div>

              {/* Usage Counter */}
              {user.expiryEnabled && !isAdmin && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Usage Counter
                    </span>
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user.currentUses} / {user.maxUses}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        isExpiringSoon
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  {isLowUses && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      isDark ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      Only {user.usesRemaining} uses remaining
                    </div>
                  )}
                </div>
              )}

              {!user.expiryEnabled && (
                <div className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Unlimited usage enabled
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenAdmin();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </button>
              )}

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onOpenSettings();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserStatusBar;
