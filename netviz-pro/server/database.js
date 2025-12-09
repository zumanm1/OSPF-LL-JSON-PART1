/**
 * SQLite Database for User Management
 * Features: CRUD operations, usage tracking, expiry flags
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'users.db');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    max_uses INTEGER DEFAULT 10,
    current_uses INTEGER DEFAULT 0,
    is_expired INTEGER DEFAULT 0,
    expiry_enabled INTEGER DEFAULT 1,
    must_change_password INTEGER DEFAULT 0,
    password_change_grace_logins INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    success INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'router',
    ip_address TEXT NOT NULL,
    protocol TEXT DEFAULT 'ssh',
    port INTEGER DEFAULT 22,
    username TEXT,
    password TEXT, -- Note: Should be encrypted in production
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Add new columns to existing tables if they don't exist (migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_change_grace_logins INTEGER DEFAULT 10`);
} catch (e) { /* Column already exists */ }

const ADMIN_USERNAME = process.env.APP_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD;

const ensureSecureBootstrapCredentials = () => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('[DB] APP_ADMIN_USERNAME and APP_ADMIN_PASSWORD must be set before starting the authentication service.');
  }

  if (ADMIN_USERNAME.length < 3) {
    throw new Error('[DB] APP_ADMIN_USERNAME must be at least 3 characters long.');
  }

  if (ADMIN_PASSWORD === 'admin123') {
    throw new Error('[DB] APP_ADMIN_PASSWORD cannot be the insecure default value "admin123".');
  }

  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('[DB] APP_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const lowerPassword = ADMIN_PASSWORD.toLowerCase();
  if (lowerPassword.includes('password') || lowerPassword.includes('change') || lowerPassword.includes('admin')) {
    throw new Error('[DB] APP_ADMIN_PASSWORD appears to be a placeholder. Set a unique, random password.');
  }

  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
  if (!complexity.test(ADMIN_PASSWORD)) {
    throw new Error('[DB] APP_ADMIN_PASSWORD must include upper & lower case letters, a number, and a symbol.');
  }
};

const createBootstrapAdminIfMissing = () => {
  ensureSecureBootstrapCredentials();

  const existingAdmin = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(ADMIN_USERNAME);

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    db.prepare(`
      INSERT INTO users (
        username,
        password_hash,
        role,
        max_uses,
        expiry_enabled,
        must_change_password,
        password_change_grace_logins
      )
      VALUES (?, ?, 'admin', 0, 0, 0, 0)
    `).run(ADMIN_USERNAME, passwordHash);

    console.log(`[DB] Created initial admin account "${ADMIN_USERNAME}" using supplied bootstrap credentials.`);
  } else if (bcrypt.compareSync('admin123', existingAdmin.password_hash)) {
    throw new Error(`[DB] Admin account "${existingAdmin.username}" is still using the prohibited default password. Reset it before starting the service.`);
  }
};

const blockDefaultPasswords = () => {
  const users = db.prepare('SELECT id, username, password_hash FROM users').all();
  for (const user of users) {
    if (bcrypt.compareSync('admin123', user.password_hash)) {
      throw new Error(`[DB] User "${user.username}" is using the prohibited default password "admin123". Update the credential and restart.`);
    }
  }
};

blockDefaultPasswords();
createBootstrapAdminIfMissing();

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

export const createUser = (username, password, role = 'user', maxUses = 10, expiryEnabled = 1) => {
  const passwordHash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, max_uses, expiry_enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, passwordHash, role, maxUses, expiryEnabled);
    return { success: true, userId: result.lastInsertRowid };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Username already exists' };
    }
    return { success: false, error: error.message };
  }
};

export const getUserById = (id) => {
  return db.prepare(`
    SELECT id, username, role, max_uses, current_uses, is_expired, expiry_enabled,
           must_change_password, password_change_grace_logins,
           created_at, updated_at, last_login
    FROM users WHERE id = ?
  `).get(id);
};

export const getUserByUsername = (username) => {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
};

export const getAllUsers = () => {
  return db.prepare(`
    SELECT id, username, role, max_uses, current_uses, is_expired, expiry_enabled,
           must_change_password, password_change_grace_logins,
           created_at, updated_at, last_login
    FROM users ORDER BY created_at DESC
  `).all();
};

export const updateUser = (id, updates) => {
  // CRITICAL FIX: Whitelist allowed fields to prevent SQL injection
  // Only these exact field names are allowed - no dynamic injection possible
  const allowedFields = ['username', 'role', 'max_uses', 'is_expired', 'expiry_enabled'];

  // CRITICAL FIX: Validate that id is a number to prevent injection
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return { success: false, error: 'Invalid user ID' };
  }

  // Filter to only allowed fields and validate values
  const fieldsToUpdate = Object.keys(updates).filter(k => allowedFields.includes(k));

  if (fieldsToUpdate.length === 0) {
    return { success: false, error: 'No valid fields to update' };
  }

  // CRITICAL FIX: Validate each field value type
  const values = [];
  for (const field of fieldsToUpdate) {
    const value = updates[field];

    // Type validation per field
    if (field === 'username') {
      if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
        return { success: false, error: 'Invalid username' };
      }
      values.push(value);
    } else if (field === 'role') {
      if (value !== 'admin' && value !== 'user') {
        return { success: false, error: 'Invalid role (must be admin or user)' };
      }
      values.push(value);
    } else if (field === 'max_uses') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0) {
        return { success: false, error: 'Invalid max_uses (must be non-negative integer)' };
      }
      values.push(numValue);
    } else if (field === 'is_expired' || field === 'expiry_enabled') {
      // Boolean fields stored as 0/1
      const boolValue = value ? 1 : 0;
      values.push(boolValue);
    }
  }

  // Build parameterized query with validated field names
  const setClause = fieldsToUpdate.map(f => `${f} = ?`).join(', ');
  values.push(userId);

  try {
    db.prepare(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePassword = (id, newPassword) => {
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  // Clear must_change_password flag and reset grace logins when password is changed
  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0, password_change_grace_logins = 10, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(passwordHash, id);
  console.log(`[DB] Password updated for user ID ${id} - Password change requirement cleared`);
  return { success: true };
};

export const deleteUser = (id) => {
  // Prevent deleting the last admin
  const user = getUserById(id);
  if (user?.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot delete the last admin user' };
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
};

export const resetUserUsage = (id) => {
  db.prepare('UPDATE users SET current_uses = 0, is_expired = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  return { success: true };
};

// ============================================================================
// DEVICE OPERATIONS
// ============================================================================

export const createDevice = (device) => {
  const { name, type, ip_address, protocol, port, username, password, created_by } = device;
  try {
    const result = db.prepare(`
      INSERT INTO devices (name, type, ip_address, protocol, port, username, password, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, type, ip_address, protocol, port, username, password, created_by);
    return { success: true, deviceId: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDevicesByUser = (userId) => {
  return db.prepare('SELECT id, name, type, ip_address, protocol, port, username, created_at FROM devices WHERE created_by = ?').all(userId);
};

export const getDeviceById = (id) => {
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
};

export const deleteDevice = (id) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  return { success: true };
};

// ============================================================================
// AUTHENTICATION & USAGE TRACKING
// ============================================================================

export const verifyPassword = (username, password) => {
  const user = getUserByUsername(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid password' };
  }

  return { success: true, user };
};

export const incrementUsage = (userId) => {
  const user = getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };

  // Skip usage tracking if expiry is disabled or user is admin
  if (!user.expiry_enabled || user.role === 'admin') {
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    return { success: true, usesRemaining: -1, isExpired: false };
  }

  const newUses = user.current_uses + 1;
  const isExpired = user.max_uses > 0 && newUses >= user.max_uses;

  db.prepare(`
    UPDATE users
    SET current_uses = ?, is_expired = ?, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newUses, isExpired ? 1 : 0, userId);

  return {
    success: true,
    usesRemaining: Math.max(0, user.max_uses - newUses),
    isExpired
  };
};

export const checkExpiry = (userId) => {
  const user = getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };

  // Admin never expires
  if (user.role === 'admin') {
    return { success: true, isExpired: false, usesRemaining: -1 };
  }

  // If expiry is disabled
  if (!user.expiry_enabled) {
    return { success: true, isExpired: false, usesRemaining: -1 };
  }

  return {
    success: true,
    isExpired: user.is_expired === 1,
    usesRemaining: Math.max(0, user.max_uses - user.current_uses)
  };
};

// Check and update password change status
export const checkPasswordChangeRequired = (userId) => {
  const user = getUserById(userId);
  if (!user) return { mustChange: false, graceLoginsRemaining: 0, forceChange: false };

  // If password change is required (using default password)
  if (user.must_change_password === 1) {
    // Decrement grace logins
    const newGraceLogins = Math.max(0, (user.password_change_grace_logins || 10) - 1);

    db.prepare(`
      UPDATE users SET password_change_grace_logins = ? WHERE id = ?
    `).run(newGraceLogins, userId);

    // Force change if grace period expired
    const forceChange = newGraceLogins === 0;

    return {
      mustChange: true,
      graceLoginsRemaining: newGraceLogins,
      forceChange
    };
  }

  return { mustChange: false, graceLoginsRemaining: 10, forceChange: false };
};

export const recordLogin = (userId, ipAddress, success = true) => {
  // Skip recording if userId is null (failed login with unknown user)
  if (userId === null || userId === undefined) {
    console.log(`[DB] Login attempt from ${ipAddress}: ${success ? 'success' : 'failed (unknown user)'}`);
    return;
  }

  db.prepare(`
    INSERT INTO login_history (user_id, ip_address, success) VALUES (?, ?, ?)
  `).run(userId, ipAddress, success ? 1 : 0);
};

export const getLoginHistory = (userId, limit = 10) => {
  return db.prepare(`
    SELECT * FROM login_history WHERE user_id = ? ORDER BY login_at DESC LIMIT ?
  `).all(userId, limit);
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const createSession = (userId, token, expiresIn = 3600) => {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)
  `).run(userId, token, expiresAt);
};

export const validateSession = (token) => {
  const session = db.prepare(`
    SELECT s.*, u.username, u.role, u.is_expired, u.expiry_enabled, u.max_uses, u.current_uses
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  return session || null;
};

export const deleteSession = (token) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
};

export const cleanExpiredSessions = () => {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
};

// Clean expired sessions every hour
setInterval(cleanExpiredSessions, 3600000);

// ============================================================================
// DATABASE HEALTH CHECK
// ============================================================================

export const testDatabaseConnection = () => {
  try {
    // Execute a simple query to verify database is accessible
    const result = db.prepare('SELECT 1 as test').get();
    return result && result.test === 1;
  } catch (error) {
    console.error('[DB] Database connection test failed:', error.message);
    return false;
  }
};

export default db;
