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
import crypto from 'crypto';

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
  recordLogin,
  cleanExpiredSessions,
  createSession,
  validateSession,
  deleteSession,
  checkPasswordChangeRequired,
  getLoginHistory,
  checkExpiry,
  testDatabaseConnection
} from './database.js';

import {
  securityMiddleware,
  authSecurityMiddleware,
  adminSecurityMiddleware,
  uploadSecurityMiddleware,
  pinProtectedRateLimit
} from './securityMiddleware.js';

import {
  initAuthVault,
  getAuthMode,
  isAuthVaultActive,
  verifyToken,
  getAuthConfig,
  getJwtSecret
} from './lib/auth-unified.js';

import deviceRouter from './pyats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const app = express();
const PORT = parseInt(process.env.AUTH_PORT || '9041', 10);
// Server Binding - Controls which interface the server listens on
// Options: 127.0.0.1 (localhost only), 0.0.0.0 (all interfaces), or specific IP
const SERVER_HOST = process.env.SERVER_HOST || process.env.AUTH_HOST || '0.0.0.0';
const LOCALHOST_ONLY = (process.env.LOCALHOST_ONLY || 'false').toLowerCase() === 'true';
const LISTEN_HOST = LOCALHOST_ONLY ? '127.0.0.1' : SERVER_HOST;

// IP Whitelist - Comma-separated list of allowed client IPs
// Use 0.0.0.0 to allow all IPs (not recommended for production)
// Examples: 127.0.0.1,192.168.1.0/24,10.0.0.5
const rawAllowedIPs = process.env.ALLOWED_IPS
  ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
  : null;

// Check if 0.0.0.0 is in the list (means allow all)
const ALLOW_ALL_IPS = rawAllowedIPs && rawAllowedIPs.includes('0.0.0.0');
const ALLOWED_IPS = ALLOW_ALL_IPS ? null : rawAllowedIPs; // null = allow all

// Additional CORS origins - comma-separated
const ALLOWED_CORS_ORIGINS = process.env.ALLOWED_CORS_ORIGINS
  ? process.env.ALLOWED_CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

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
// CRITICAL PRODUCTION SECURITY: Apply security middleware first
app.use(securityMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Helper function to check if IP matches pattern (supports CIDR notation)
const ipMatchesPattern = (clientIP, pattern) => {
  // Direct match
  if (clientIP === pattern) return true;

  // Handle IPv6 localhost variations
  if (pattern === '127.0.0.1') {
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') return true;
  }

  // CIDR notation support (basic implementation)
  if (pattern.includes('/')) {
    const [subnet, bits] = pattern.split('/');
    const subnetParts = subnet.split('.').map(Number);
    const clientParts = clientIP.replace('::ffff:', '').split('.').map(Number);

    if (subnetParts.length !== 4 || clientParts.length !== 4) return false;

    const mask = parseInt(bits, 10);
    const subnetInt = (subnetParts[0] << 24) | (subnetParts[1] << 16) | (subnetParts[2] << 8) | subnetParts[3];
    const clientInt = (clientParts[0] << 24) | (clientParts[1] << 16) | (clientParts[2] << 8) | clientParts[3];
    const maskInt = ~((1 << (32 - mask)) - 1);

    return (subnetInt & maskInt) === (clientInt & maskInt);
  }

  return false;
};

// IP Allowlist middleware
const checkIPAllowlist = (req, res, next) => {
  // If no allowlist configured, allow all (based on LOCALHOST_ONLY)
  if (!ALLOWED_IPS || ALLOWED_IPS.length === 0) {
    return next();
  }

  const clientIP = req.ip || req.connection?.remoteAddress || '';
  const normalizedIP = clientIP.replace('::ffff:', ''); // Handle IPv4-mapped IPv6

  // Check if client IP matches any allowed pattern
  const isAllowed = ALLOWED_IPS.some(pattern => ipMatchesPattern(normalizedIP, pattern));

  if (!isAllowed) {
    console.warn(`[Auth] Access denied for IP: ${clientIP} (not in allowlist)`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this service'
    });
  }

  next();
};

// Apply IP allowlist to all routes
app.use(checkIPAllowlist);

// Dynamic CORS - allow requests from any origin on port 9040 + custom origins
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

    // Check custom allowed origins
    if (ALLOWED_CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked origins for debugging
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Authentication middleware (supports both legacy JWT and Keycloak)
const requireAuth = async (req, res, next) => {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const cookieToken = req.cookies?.netviz_session;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Try unified token verification (Keycloak first, then legacy)
  const verifiedUser = await verifyToken(token, JWT_SECRET);

  if (verifiedUser) {
    // Keycloak tokens don't need session validation
    if (verifiedUser.authSource === 'keycloak') {
      req.user = verifiedUser;
      req.token = token;
      return next();
    }

    // Legacy tokens need session validation
    const session = validateSession(token);
    if (!session) {
      if (cookieToken) {
        res.clearCookie('netviz_session', COOKIE_OPTIONS);
      }
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Check expiry for legacy users
    const expiryStatus = checkExpiry(verifiedUser.userId);
    if (expiryStatus.isExpired) {
      if (cookieToken) {
        res.clearCookie('netviz_session', COOKIE_OPTIONS);
      }
      return res.status(403).json({
        error: 'Account expired',
        message: 'Your account has reached the maximum number of uses. Contact admin.'
      });
    }

    req.user = verifiedUser;
    req.session = session;
    req.token = token;
    return next();
  }

  if (cookieToken) {
    res.clearCookie('netviz_session', COOKIE_OPTIONS);
  }
  return res.status(401).json({ error: 'Invalid token' });
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
app.post('/api/auth/login', authSecurityMiddleware, (req, res) => {
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
// DEVICE API ROUTES
// ============================================================================
app.use('/api/devices', deviceRouter);

// ============================================================================
// ADMIN-ONLY ROUTES

// ============================================================================
// ADMIN-ONLY ROUTES
// ============================================================================

// Get all users (admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, adminSecurityMiddleware, (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// Create new user (admin only)
app.post('/api/admin/users', requireAuth, requireAdmin, adminSecurityMiddleware, (req, res) => {
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
app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, adminSecurityMiddleware, (req, res) => {
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
app.post('/api/admin/users/:id/reset-usage', requireAuth, requireAdmin, adminSecurityMiddleware, (req, res) => {
  const { id } = req.params;

  const user = getUserById(parseInt(id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  resetUserUsage(parseInt(id));
  res.json({ success: true, message: `Usage reset for user: ${user.username}` });
});

// Get user login history (admin only)
app.get('/api/admin/users/:id/history', requireAuth, requireAdmin, adminSecurityMiddleware, (req, res) => {
  const { id } = req.params;
  const history = getLoginHistory(parseInt(id));
  res.json(history);
});

// ============================================================================
// PIN-PROTECTED ADMIN PASSWORD RESET (Public Endpoint - Protected by PIN)
// ============================================================================

// SECURITY: Validate PIN at startup
const ADMIN_RESET_PIN = process.env.ADMIN_RESET_PIN;

if (!ADMIN_RESET_PIN || ADMIN_RESET_PIN === '12345' || ADMIN_RESET_PIN === '00000' || ADMIN_RESET_PIN === '11111') {
  console.error('[Auth] ADMIN_RESET_PIN must be set to a strong value (not default or common PIN)');
  console.error('[Auth] Set ADMIN_RESET_PIN in .env.local to a unique 8+ character value');
  process.exit(1);
}

if (ADMIN_RESET_PIN.length < 8) {
  console.error('[Auth] ADMIN_RESET_PIN must be at least 8 characters long for security');
  process.exit(1);
}

// Rate limiting for reset attempts
const resetAttempts = new Map(); // IP -> {count, lastAttempt, blockUntil}

// Cleanup old attempts every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of resetAttempts.entries()) {
    // Remove entries older than 24 hours
    if (now - data.lastAttempt > 86400000) {
      resetAttempts.delete(ip);
    }
  }
}, 3600000);

// Optional: IP whitelist
const ADMIN_RESET_ALLOWED_IPS = process.env.ADMIN_RESET_ALLOWED_IPS
  ? process.env.ADMIN_RESET_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : null; // null = allow all IPs (less secure but more flexible)

app.post('/api/auth/reset-admin', pinProtectedRateLimit, (req, res) => {
  const { pin } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // IP Whitelist check (if configured)
  if (ADMIN_RESET_ALLOWED_IPS && !ADMIN_RESET_ALLOWED_IPS.includes(clientIP)) {
    console.warn(`[Auth] Reset attempt from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ error: 'Access denied from this IP address' });
  }

  // Get or initialize attempt tracking for this IP
  let attempts = resetAttempts.get(clientIP) || { count: 0, lastAttempt: 0, blockUntil: 0 };

  // Check if IP is currently blocked
  if (attempts.blockUntil > now) {
    const remainingMinutes = Math.ceil((attempts.blockUntil - now) / 60000);
    console.warn(`[Auth] Reset blocked - IP ${clientIP} is rate limited`);
    return res.status(429).json({
      error: 'Too many reset attempts',
      message: `Please try again in ${remainingMinutes} minute(s)`
    });
  }

  // Reset counter after 1 hour of no attempts
  if (now - attempts.lastAttempt > 3600000) {
    attempts.count = 0;
  }

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  // Validate PIN
  if (pin !== ADMIN_RESET_PIN) {
    attempts.count++;
    attempts.lastAttempt = now;

    // Progressive blocking: 3 attempts = 1 hour block, 6+ attempts = 24 hour block
    if (attempts.count >= 6) {
      attempts.blockUntil = now + 86400000; // 24 hours
      console.error(`[Auth] SECURITY ALERT - Multiple failed reset attempts from ${clientIP} - Blocked for 24 hours`);
    } else if (attempts.count >= 3) {
      attempts.blockUntil = now + 3600000; // 1 hour
      console.warn(`[Auth] Failed reset attempts from ${clientIP} - Blocked for 1 hour`);
    } else {
      console.log(`[Auth] Failed admin reset attempt ${attempts.count}/3 from ${clientIP}`);
    }

    resetAttempts.set(clientIP, attempts);

    return res.status(401).json({
      error: 'Invalid PIN',
      attemptsRemaining: Math.max(0, 3 - attempts.count)
    });
  }

  // PIN is correct - proceed with reset

  // Find admin user
  const adminUser = getUserByUsername(process.env.APP_ADMIN_USERNAME || 'netviz_admin');
  if (!adminUser) {
    return res.status(404).json({ error: 'Admin user not found' });
  }

  // Generate a cryptographically secure random temporary password
  const tempPassword = crypto.randomBytes(16).toString('base64').slice(0, 20) + '!Aa1';

  updatePassword(adminUser.id, tempPassword);

  // Clear rate limit for this IP after successful reset
  resetAttempts.delete(clientIP);

  // Log to server console only (NOT in response for security)
  console.log(`[Auth] ============================================`);
  console.log(`[Auth] ADMIN PASSWORD RESET`);
  console.log(`[Auth] User: ${adminUser.username}`);
  console.log(`[Auth] Temporary Password: ${tempPassword}`);
  console.log(`[Auth] IP: ${clientIP}`);
  console.log(`[Auth] Time: ${new Date().toISOString()}`);
  console.log(`[Auth] ============================================`);

  res.json({
    success: true,
    message: 'Admin password has been reset successfully. Check server console/logs for the temporary password.'
  });
});

// HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
  const dbConnected = testDatabaseConnection();
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'NetViz Pro Auth Server',
    network_accessible: true,
    database: dbConnected ? 'connected' : 'disconnected',
    authVault: isAuthVaultActive() ? 'active' : 'inactive',
    authMode: getAuthMode(),
    timestamp: new Date().toISOString()
  });
});

// AUTH CONFIG ENDPOINT (for frontend to detect auth mode)
// ============================================================================
app.get('/api/auth/config', (req, res) => {
  res.json(getAuthConfig());
});

// ============================================================================
// START SERVER (NETWORK ACCESSIBLE)
// ============================================================================
async function startServer() {
  // Initialize Auth-Vault (Keycloak + Vault)
  const authVaultActive = await initAuthVault(JWT_SECRET);

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
    console.log('  Auth-Vault:');
    if (authVaultActive) {
      console.log(`  - Status: Active (mode: ${getAuthMode()})`);
    } else {
      console.log(`  - Status: Inactive (using legacy auth)`);
    }
    console.log('');
    console.log('  Access Control:');
    if (ALLOWED_IPS && ALLOWED_IPS.length > 0) {
      console.log(`  - IP Allowlist: ${ALLOWED_IPS.join(', ')}`);
    } else {
      console.log(`  - IP Allowlist: All IPs allowed (no restriction)`);
    }
    if (ALLOWED_CORS_ORIGINS.length > 0) {
      console.log(`  - Extra CORS Origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
    }
    console.log('');
    console.log('  Security Features:');
    console.log('  - Password hashing with bcrypt');
    console.log('  - JWT session tokens (secure HttpOnly cookies)');
    console.log('  - Usage counter with configurable expiry');
    console.log('  - Admin-only password recovery');
    console.log(`  - SameSite=strict cookies; Secure=${!LOCALHOST_ONLY}`);
    console.log('  - CORS protection (port 9040 origins + custom)');
    console.log('  - IP-based access control (optional)');
    console.log('');
    console.log('============================================================');
  });
}

startServer();

export default app;
