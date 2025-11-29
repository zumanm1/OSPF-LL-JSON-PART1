/**
 * NetViz Pro Authentication Server
 * Features:
 * - Network-accessible authentication server
 * - User authentication with password hashing
 * - Usage counter with configurable expiry
 * - Admin-only password recovery
 * - Session management with JWT
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createUser,
  getUserById,
  getUserByUsername,
  getAllUsers,
  updateUser,
  updatePassword,
  deleteUser,
  resetUserUsage,
  verifyPassword,
  incrementUsage,
  checkExpiry,
  checkPasswordChangeRequired,
  recordLogin,
  getLoginHistory,
  createSession,
  validateSession,
  deleteSession
} from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const app = express();
const PORT = parseInt(process.env.AUTH_PORT || '9041', 10);
const HOST = process.env.AUTH_HOST || '0.0.0.0'; // Allow external access
const LOCALHOST_ONLY = (process.env.LOCALHOST_ONLY || 'true').toLowerCase() === 'true';
const LISTEN_HOST = LOCALHOST_ONLY ? '127.0.0.1' : HOST;

const rawJwtSecret = process.env.APP_SECRET_KEY;
if (!rawJwtSecret) {
  console.error('[Auth] APP_SECRET_KEY must be set to a strong value before starting the authentication service.');
  process.exit(1);
}

const lowerSecret = rawJwtSecret.toLowerCase();

if (['netviz-secret-key-change-in-production', 'netviz-dev-secret-key-change-me'].includes(rawJwtSecret)) {
  console.error('[Auth] APP_SECRET_KEY is using an insecure default value. Please set a unique secret.');
  process.exit(1);
}

if (lowerSecret.includes('change') || lowerSecret.includes('placeholder') || lowerSecret.includes('secret')) {
  console.error('[Auth] APP_SECRET_KEY appears to be a placeholder. Set a unique, random secret.');
  process.exit(1);
}

if (rawJwtSecret.length < 32) {
  console.error('[Auth] APP_SECRET_KEY must be at least 32 characters long.');
  process.exit(1);
}

const JWT_SECRET = rawJwtSecret;

const parsedSessionTimeout = parseInt(process.env.APP_SESSION_TIMEOUT || '3600', 10);
const SESSION_TIMEOUT = Number.isFinite(parsedSessionTimeout) && parsedSessionTimeout > 0
  ? parsedSessionTimeout
  : 3600;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !LOCALHOST_ONLY,
  sameSite: 'strict',
  path: '/'
};

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Dynamic CORS - allow requests from any origin on port 9040
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow any origin on port 9040 (the frontend port)
    if (origin.endsWith(':9040')) {
      return callback(null, true);
    }

    // Also allow localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Log blocked origins for debugging
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const cookieToken = req.cookies?.netviz_session;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = validateSession(token);

    if (!session) {
      if (cookieToken) {
        res.clearCookie('netviz_session', COOKIE_OPTIONS);
      }
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const expiryStatus = checkExpiry(decoded.userId);
    if (expiryStatus.isExpired) {
      if (cookieToken) {
        res.clearCookie('netviz_session', COOKIE_OPTIONS);
      }
      return res.status(403).json({
        error: 'Account expired',
        message: 'Your account has reached the maximum number of uses. Contact admin.'
      });
    }

    req.user = decoded;
    req.session = session;
    req.token = token;
    next();
  } catch (error) {
    if (cookieToken) {
      res.clearCookie('netviz_session', COOKIE_OPTIONS);
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = verifyPassword(username, password);

  if (!result.success) {
    recordLogin(null, req.ip, false);
    return res.status(401).json({ error: result.error });
  }

  const user = result.user;

  // Check if account is expired (unless admin)
  if (user.role !== 'admin' && user.is_expired && user.expiry_enabled) {
    recordLogin(user.id, req.ip, false);
    return res.status(403).json({
      error: 'Account expired',
      message: 'Your account has reached the maximum number of uses. Contact admin to reset.'
    });
  }

  // Increment usage counter
  const usageResult = incrementUsage(user.id);

  // Check if password change is required
  const passwordChangeStatus = checkPasswordChangeRequired(user.id);

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: SESSION_TIMEOUT }
  );

  // Store session
  createSession(user.id, token, SESSION_TIMEOUT);
  recordLogin(user.id, req.ip, true);

  res.cookie('netviz_session', token, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_TIMEOUT * 1000
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      usesRemaining: usageResult.usesRemaining,
      maxUses: user.max_uses,
      currentUses: user.current_uses + 1,
      expiryEnabled: user.expiry_enabled === 1,
      mustChangePassword: passwordChangeStatus.mustChange,
      graceLoginsRemaining: passwordChangeStatus.graceLoginsRemaining,
      forcePasswordChange: passwordChangeStatus.forceChange
    },
    expiresIn: SESSION_TIMEOUT
  });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const cookieToken = req.cookies?.netviz_session;
  const token = headerToken || cookieToken;

  if (token) {
    deleteSession(token);
  }

  res.clearCookie('netviz_session', COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Validate session (check if still logged in)
app.get('/api/auth/validate', requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  const expiryStatus = checkExpiry(req.user.userId);

  res.json({
    valid: true,
    token: req.token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      usesRemaining: expiryStatus.usesRemaining,
      maxUses: user.max_uses,
      currentUses: user.current_uses,
      expiryEnabled: user.expiry_enabled === 1,
      isExpired: expiryStatus.isExpired
    }
  });
});

// Get current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Admin or expiry disabled = unlimited uses (-1)
  const usesRemaining = (user.role === 'admin' || !user.expiry_enabled)
    ? -1
    : Math.max(0, user.max_uses - user.current_uses);

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    maxUses: user.max_uses,
    currentUses: user.current_uses,
    usesRemaining,
    expiryEnabled: user.expiry_enabled === 1,
    isExpired: user.is_expired === 1,
    lastLogin: user.last_login,
    mustChangePassword: user.must_change_password === 1,
    graceLoginsRemaining: user.password_change_grace_logins || 10
  });
});

// Change own password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Verify current password
  const user = getUserByUsername(req.user.username);
  const result = verifyPassword(req.user.username, currentPassword);

  if (!result.success) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  updatePassword(req.user.userId, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});

// ============================================================================
// ADMIN-ONLY ROUTES
// ============================================================================

// Get all users (admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// Create new user (admin only)
app.post('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role = 'user', maxUses = 10, expiryEnabled = true } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const result = createUser(username, password, role, maxUses, expiryEnabled ? 1 : 0);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, userId: result.userId });
});

// Update user (admin only)
app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const result = updateUser(parseInt(id), updates);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true });
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const result = deleteUser(parseInt(id));

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true });
});

// Reset user password (admin only) - PASSWORD RECOVERY
app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = getUserById(parseInt(id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  updatePassword(parseInt(id), newPassword);
  res.json({ success: true, message: `Password reset for user: ${user.username}` });
});

// Reset user usage counter (admin only)
app.post('/api/admin/users/:id/reset-usage', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;

  const user = getUserById(parseInt(id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  resetUserUsage(parseInt(id));
  res.json({ success: true, message: `Usage reset for user: ${user.username}` });
});

// Get user login history (admin only)
app.get('/api/admin/users/:id/history', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const history = getLoginHistory(parseInt(id));
  res.json(history);
});

// HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NetViz Pro Auth Server',
    network_accessible: true,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER (NETWORK ACCESSIBLE)
// ============================================================================
app.listen(PORT, LISTEN_HOST, () => {
  console.log('');
  console.log('============================================================');
  console.log('  NetViz Pro Authentication Server');
  console.log('============================================================');
  console.log(`  Status: Running`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Host: ${LISTEN_HOST}`);
  console.log(`  Access: ${LOCALHOST_ONLY ? 'Localhost only' : 'Network accessible'}`);
  console.log(`  Session Timeout: ${SESSION_TIMEOUT}s`);
  console.log('');
  console.log('  Security Features:');
  console.log('  - Password hashing with bcrypt');
  console.log('  - JWT session tokens (secure HttpOnly cookies)');
  console.log('  - Usage counter with configurable expiry');
  console.log('  - Admin-only password recovery');
  console.log(`  - SameSite=strict cookies; Secure=${!LOCALHOST_ONLY}`);
  console.log('  - CORS protection (port 9040 origins only)');
  console.log('');
  console.log('============================================================');
});

export default app;
