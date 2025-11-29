/**
 * Admin Panel Component
 * Features:
 * - User CRUD operations
 * - Password recovery (admin only)
 * - Usage counter reset
 * - Expiry flag management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  X, Users, Plus, Trash2, RefreshCw, Key, Shield, User as UserIcon,
  AlertCircle, Check, Edit2, Save, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface AdminUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  max_uses: number;
  current_uses: number;
  is_expired: number;
  expiry_enabled: number;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// API HELPER (DYNAMIC - USES CURRENT HOST)
// ============================================================================
const getAuthApiUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:9041/api`;
};

const apiCall = async (endpoint: string, token: string, options: RequestInit = {}) => {
  const AUTH_API_URL = getAuthApiUrl();
  const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    },
    credentials: 'include'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

// ============================================================================
// COMPONENT
// ============================================================================
const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { token, user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    maxUses: 10,
    expiryEnabled: true
  });

  // Password reset
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Edit user
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ maxUses: 10, expiryEnabled: true });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/admin/users', token);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && token) {
      fetchUsers();
    }
  }, [isOpen, token, fetchUsers]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      await apiCall('/admin/users', token, {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      setSuccess(`User "${newUser.username}" created successfully`);
      setNewUser({ username: '', password: '', role: 'user', maxUses: 10, expiryEnabled: true });
      setShowNewUserForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setError(null);
    setSuccess(null);

    try {
      await apiCall(`/admin/users/${userId}`, token, { method: 'DELETE' });
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (!token || !resetPasswordUserId || !newPassword) return;

    setError(null);
    setSuccess(null);

    try {
      await apiCall(`/admin/users/${resetPasswordUserId}/reset-password`, token, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });

      setSuccess('Password reset successfully');
      setResetPasswordUserId(null);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleResetUsage = async (userId: number) => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      await apiCall(`/admin/users/${userId}/reset-usage`, token, { method: 'POST' });
      setSuccess('Usage counter reset successfully');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset usage');
    }
  };

  const handleUpdateUser = async (userId: number) => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      await apiCall(`/admin/users/${userId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          max_uses: editForm.maxUses,
          expiry_enabled: editForm.expiryEnabled ? 1 : 0
        })
      });

      setSuccess('User updated successfully');
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`relative w-full max-w-4xl rounded-xl shadow-2xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Admin Panel - User Management
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Messages */}
            {error && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Check className="w-5 h-5" />
                {success}
              </div>
            )}

            {/* Add User Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowNewUserForm(!showNewUserForm)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New User
                {showNewUserForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* New User Form */}
            {showNewUserForm && (
              <form
                onSubmit={handleCreateUser}
                className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
              >
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Create New User
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Max Uses (0 = unlimited)
                    </label>
                    <input
                      type="number"
                      value={newUser.maxUses}
                      onChange={(e) => setNewUser({ ...newUser, maxUses: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      min={0}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.expiryEnabled}
                        onChange={(e) => setNewUser({ ...newUser, expiryEnabled: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Enable Expiry</span>
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewUserForm(false)}
                    className={`px-4 py-2 rounded-lg ${
                      isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Username
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Role
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Usage
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            {user.username}
                            {user.id === currentUser?.id && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                              }`}>
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3`}>
                          <span className={`px-2 py-1 text-xs rounded ${
                            user.role === 'admin'
                              ? isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editForm.maxUses}
                                onChange={(e) => setEditForm({ ...editForm, maxUses: parseInt(e.target.value) || 0 })}
                                className={`w-20 px-2 py-1 rounded border ${
                                  isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                min={0}
                              />
                              <label className="flex items-center gap-1 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={editForm.expiryEnabled}
                                  onChange={(e) => setEditForm({ ...editForm, expiryEnabled: e.target.checked })}
                                  className="w-3 h-3 text-emerald-600 rounded"
                                />
                                <span>Expiry</span>
                              </label>
                            </div>
                          ) : (
                            user.expiry_enabled
                              ? `${user.current_uses} / ${user.max_uses}`
                              : `${user.current_uses} (no limit)`
                          )}
                        </td>
                        <td className={`px-4 py-3`}>
                          {user.is_expired ? (
                            <span className={`px-2 py-1 text-xs rounded ${
                              isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                            }`}>
                              Expired
                            </span>
                          ) : (
                            <span className={`px-2 py-1 text-xs rounded ${
                              isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {editingUserId === user.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateUser(user.id)}
                                  className="p-1.5 text-emerald-500 hover:bg-emerald-500/20 rounded"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                                  title="Cancel"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingUserId(user.id);
                                    setEditForm({
                                      maxUses: user.max_uses,
                                      expiryEnabled: user.expiry_enabled === 1
                                    });
                                  }}
                                  className={`p-1.5 rounded ${
                                    isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setResetPasswordUserId(user.id)}
                                  className={`p-1.5 rounded ${
                                    isDark ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-yellow-600 hover:bg-yellow-100'
                                  }`}
                                  title="Reset Password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetUsage(user.id)}
                                  className={`p-1.5 rounded ${
                                    isDark ? 'text-blue-400 hover:bg-blue-500/20' : 'text-blue-600 hover:bg-blue-100'
                                  }`}
                                  title="Reset Usage Counter"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                {user.id !== currentUser?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className={`p-1.5 rounded ${
                                      isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-100'
                                    }`}
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Password Reset Modal */}
            {resetPasswordUserId && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={() => setResetPasswordUserId(null)} />
                <div className={`relative p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} max-w-md w-full`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Reset Password
                  </h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Enter a new password for user: {users.find(u => u.id === resetPasswordUserId)?.username}
                  </p>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    className={`w-full px-3 py-2 rounded-lg border mb-4 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    minLength={6}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setResetPasswordUserId(null);
                        setNewPassword('');
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={newPassword.length < 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-500 text-white rounded-lg"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Users: {users.length}
              </span>
              <button
                onClick={fetchUsers}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
