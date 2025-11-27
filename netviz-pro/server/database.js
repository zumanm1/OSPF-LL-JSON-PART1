/**
 * SQLite Database for User Management
 * Features: CRUD operations, usage tracking, expiry flags
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'users.db');

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
`);

// Create default admin user if not exists
const createDefaultAdmin = () => {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, max_uses, expiry_enabled)
      VALUES (?, ?, 'admin', 0, 0)
    `).run('admin', passwordHash);
    console.log('[DB] Default admin user created (admin/admin123)');
  }
};

createDefaultAdmin();

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
           created_at, updated_at, last_login
    FROM users ORDER BY created_at DESC
  `).all();
};

export const updateUser = (id, updates) => {
  const allowedFields = ['username', 'role', 'max_uses', 'is_expired', 'expiry_enabled'];
  const fieldsToUpdate = Object.keys(updates).filter(k => allowedFields.includes(k));

  if (fieldsToUpdate.length === 0) {
    return { success: false, error: 'No valid fields to update' };
  }

  const setClause = fieldsToUpdate.map(f => `${f} = ?`).join(', ');
  const values = fieldsToUpdate.map(f => updates[f]);
  values.push(id);

  try {
    db.prepare(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePassword = (id, newPassword) => {
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, id);
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

export const recordLogin = (userId, ipAddress, success = true) => {
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

export default db;
