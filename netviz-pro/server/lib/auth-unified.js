/**
 * Unified Authentication Module for NetViz Pro (OSPF-LL-JSON-PART1)
 * Supports both legacy JWT mode and Auth-Vault (Keycloak) mode
 */

import jwt from 'jsonwebtoken';
import { initKeycloakVerifier } from './keycloak-verifier.js';
import { initVaultClient } from './vault-client.js';

// Auth mode configuration
let authMode = 'legacy';
let keycloakInitialized = false;
let vaultInitialized = false;
let vaultJwtSecret = null;

/**
 * Initialize auth-vault integration
 */
export async function initAuthVault(legacyJwtSecret) {
  try {
    console.log('[Auth] Checking Auth-Vault availability...');

    // Try to initialize Keycloak
    const keycloak = initKeycloakVerifier();
    const keycloakAvailable = await keycloak.isAvailable();

    if (keycloakAvailable) {
      console.log('[Auth] Keycloak is available at', process.env.KEYCLOAK_URL || 'http://localhost:9120');
      keycloakInitialized = true;
    } else {
      console.log('[Auth] Keycloak not available, will use legacy mode');
    }

    // Try to initialize Vault
    if (process.env.VAULT_ROLE_ID && process.env.VAULT_SECRET_ID) {
      try {
        const vault = initVaultClient();
        await vault.authenticate();

        const vaultConfig = await vault.getConfig();
        vaultJwtSecret = vaultConfig.jwt_secret;
        vaultInitialized = true;
        console.log('[Auth] Vault is available, secrets loaded');
      } catch (e) {
        console.log('[Auth] Vault not available:', e.message);
      }
    } else if (process.env.VAULT_TOKEN) {
      try {
        const vault = initVaultClient();
        const vaultConfig = await vault.getConfig();
        vaultJwtSecret = vaultConfig.jwt_secret;
        vaultInitialized = true;
        console.log('[Auth] Vault is available (token mode), secrets loaded');
      } catch (e) {
        console.log('[Auth] Vault not available:', e.message);
      }
    }

    // Determine auth mode
    if (keycloakInitialized) {
      authMode = 'keycloak';
      console.log('[Auth] Mode: Keycloak (Auth-Vault)');
    } else {
      authMode = 'legacy';
      console.log('[Auth] Mode: Legacy JWT');
    }

    return keycloakInitialized || vaultInitialized;
  } catch (error) {
    console.error('[Auth] Failed to initialize Auth-Vault:', error);
    return false;
  }
}

/**
 * Get the JWT secret (from Vault or provided secret)
 */
export function getJwtSecret(fallbackSecret) {
  if (vaultJwtSecret) {
    return vaultJwtSecret;
  }
  return fallbackSecret;
}

/**
 * Get current auth mode
 */
export function getAuthMode() {
  return authMode;
}

/**
 * Check if auth-vault is active
 */
export function isAuthVaultActive() {
  return keycloakInitialized || vaultInitialized;
}

/**
 * Verify a token (Keycloak or legacy)
 * Returns null if verification fails
 */
export async function verifyToken(token, legacySecret) {
  // Try Keycloak verification first if available
  if (authMode === 'keycloak' && keycloakInitialized) {
    try {
      const keycloak = initKeycloakVerifier();
      const user = await keycloak.verifyToken(token);

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.roles[0] || 'user',
        authSource: 'keycloak',
      };
    } catch (keycloakError) {
      console.log('[Auth] Keycloak verification failed, trying legacy:', keycloakError.message);
    }
  }

  // Legacy JWT verification
  try {
    const secret = getJwtSecret(legacySecret);
    const payload = jwt.verify(token, secret);

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      authSource: 'legacy',
    };
  } catch {
    return null;
  }
}

/**
 * Create authentication middleware that supports both modes
 */
export function createAuthMiddleware(legacySecret, getUserById, validateSession, checkExpiry, COOKIE_OPTIONS) {
  return async (req, res, next) => {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const cookieToken = req.cookies?.netviz_session;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Try unified token verification
    const verifiedUser = await verifyToken(token, legacySecret);

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
      if (typeof checkExpiry === 'function') {
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
}

/**
 * Get auth configuration for frontend
 */
export function getAuthConfig() {
  return {
    authMode,
    keycloak: authMode === 'keycloak' ? {
      url: process.env.KEYCLOAK_URL || 'http://localhost:9120',
      realm: process.env.KEYCLOAK_REALM || 'ospf-ll-json-part1',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'll-json-frontend',
    } : null,
  };
}
