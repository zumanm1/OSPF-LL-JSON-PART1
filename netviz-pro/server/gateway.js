/**
 * NetViz Pro Gateway Server
 * Server-side authentication protection for the frontend
 *
 * Features:
 * - ALL requests require authentication before seeing any content
 * - Serves login page for unauthenticated users
 * - Proxies to Vite dev server only after valid authentication
 * - Session validation via auth server
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

// CRITICAL PRODUCTION SECURITY: Import security middleware
import { securityMiddleware } from './securityMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const app = express();

// Configuration
const GATEWAY_PORT = process.env.GATEWAY_PORT || 9040;
const VITE_INTERNAL_PORT = process.env.VITE_INTERNAL_PORT || 9042;
const AUTH_SERVER_PORT = process.env.AUTH_PORT || 9041;
const LOCALHOST_ONLY = (process.env.LOCALHOST_ONLY || 'true').toLowerCase() === 'true';
const LISTEN_HOST = LOCALHOST_ONLY ? '127.0.0.1' : '0.0.0.0';

const rawJwtSecret = process.env.APP_SECRET_KEY;
if (!rawJwtSecret) {
  console.error('[Gateway] APP_SECRET_KEY must be set to a strong value before starting the gateway.');
  process.exit(1);
}

const normalizedSecret = rawJwtSecret.toLowerCase();
const blockedSecrets = new Set(['netviz-secret-key-change-in-production', 'netviz-dev-secret-key-change-me']);

if (blockedSecrets.has(rawJwtSecret)) {
  console.error('[Gateway] APP_SECRET_KEY is using an insecure default value. Set a unique secret.');
  process.exit(1);
}

if (normalizedSecret.includes('change') || normalizedSecret.includes('placeholder') || normalizedSecret.includes('secret')) {
  console.error('[Gateway] APP_SECRET_KEY appears to be a placeholder. Provide a unique, random secret.');
  process.exit(1);
}

if (rawJwtSecret.length < 32) {
  console.error('[Gateway] APP_SECRET_KEY must be at least 32 characters long.');
  process.exit(1);
}

const JWT_SECRET = rawJwtSecret;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !LOCALHOST_ONLY,
  sameSite: 'strict',
  path: '/'
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Middleware
// CRITICAL PRODUCTION SECURITY: Apply security middleware first
app.use(securityMiddleware);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// LOGIN PAGE HTML (served to unauthenticated users)
// ============================================================================
const getLoginPageHTML = (error = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetViz Pro - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }
    .logo h1 {
      color: #fff;
      font-size: 28px;
      font-weight: 700;
    }
    .logo p {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 8px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      transition: all 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }
    .form-group input::placeholder {
      color: #64748b;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
    }
    .submit-btn:active {
      transform: translateY(0);
    }
    .security-badge {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .security-badge span {
      color: #64748b;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .security-badge svg {
      width: 14px;
      height: 14px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      <h1>NetViz Pro</h1>
      <p>OSPF Network Topology Visualizer</p>
    </div>

    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

    <form method="POST" action="/gateway/login">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" placeholder="Enter your username" required autofocus>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" required>
      </div>

      <button type="submit" class="submit-btn">Sign In</button>
    </form>

    <div class="security-badge">
      <span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Server-side protected access
      </span>
    </div>
  </div>
</body>
</html>
`;

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
const validateToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  // Skip auth for gateway routes and API proxy routes
  if (req.path.startsWith('/gateway/') || req.path.startsWith('/api/')) {
    return next();
  }

  // Check for auth token in cookie (MUST match auth server cookie name)
  const token = req.cookies?.netviz_session;
  const decoded = validateToken(token);

  if (!decoded) {
    if (token) {
      res.clearCookie('netviz_session', COOKIE_OPTIONS);
    }
    // Return login page for unauthenticated users
    return res.send(getLoginPageHTML());
  }

  // Token valid - allow request to proceed
  req.user = decoded;
  next();
};

// ============================================================================
// GATEWAY ROUTES
// ============================================================================

// Login form submission
app.post('/gateway/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send(getLoginPageHTML('Username and password are required'));
  }

  try {
    // Authenticate via auth server
    const response = await fetch(`http://127.0.0.1:${AUTH_SERVER_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.send(getLoginPageHTML(data.error || 'Invalid credentials'));
    }

    res.cookie('netviz_session', data.token, {
      ...COOKIE_OPTIONS,
      maxAge: (data.expiresIn || 3600) * 1000
    });

    // Use HTTP redirect instead of JavaScript redirect for better reliability
    res.redirect('/');
  } catch (err) {
    console.error('[Gateway] Auth error:', err);
    return res.send(getLoginPageHTML('Authentication server unavailable'));
  }
});

// Logout
app.get('/gateway/logout', (req, res) => {
  res.clearCookie('netviz_session', COOKIE_OPTIONS);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Logging out...</title></head>
    <body>
      <script>
        window.location.replace('/');
      </script>
      <p>Logging out... If not redirected, <a href="/">click here</a>.</p>
    </body>
    </html>
  `);
});

// ============================================================================
// PROXY API REQUESTS TO AUTH SERVER (BEFORE auth middleware)
// ============================================================================
// CRITICAL: This must come BEFORE authMiddleware so /api routes bypass gateway auth
app.use(
  '/api',
  createProxyMiddleware({
    target: `http://127.0.0.1:${AUTH_SERVER_PORT}`,
    changeOrigin: false, // Keep origin to preserve cookies
    // CRITICAL: Preserve the /api prefix in the path
    pathRewrite: {
      '^/api': '/api' // Don't strip /api
    },
    // CRITICAL: Forward cookies from browser to auth server
    onProxyReq: (proxyReq, req, res) => {
      // Forward cookies from the original request
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
      console.log(`[Gateway] Proxying ${req.method} ${req.path} to auth server`);
    },
    onError: (err, req, res) => {
      console.error('[Gateway] Auth API proxy error:', err.message);
      res.status(502).json({ error: 'Auth server unavailable' });
    }
  })
);

// ============================================================================
// APPLY AUTH MIDDLEWARE TO ALL NON-API ROUTES
// ============================================================================
app.use(authMiddleware);

// ============================================================================
// PROXY TO VITE (only reached if authenticated)
// ============================================================================
app.use(
  '/',
  createProxyMiddleware({
    target: `http://127.0.0.1:${VITE_INTERNAL_PORT}`,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxy for HMR
    onError: (err, req, res) => {
      console.error('[Gateway] Proxy error:', err.message);
      res.status(502).send(`
        <html>
          <head><title>NetViz Pro - Starting</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>NetViz Pro is starting...</h2>
            <p>Please wait a moment and refresh the page.</p>
            <p style="color: #666; font-size: 14px;">If this persists, ensure the Vite dev server is running on port ${VITE_INTERNAL_PORT}</p>
          </body>
        </html>
      `);
    }
  })
);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(GATEWAY_PORT, LISTEN_HOST, () => {
  console.log('');
  console.log('============================================================');
  console.log('  NetViz Pro Gateway Server (Protected Access)');
  console.log('============================================================');
  console.log(`  Status: Running`);
  console.log(`  Gateway Port: ${GATEWAY_PORT} (public-facing)`);
  console.log(`  Vite Internal: ${VITE_INTERNAL_PORT} (localhost only)`);
  console.log(`  Auth Server: ${AUTH_SERVER_PORT}`);
  console.log(`  Host: ${LISTEN_HOST}`);
  console.log(`  Access: ${LOCALHOST_ONLY ? 'Localhost only' : 'Network accessible'}`);
  console.log('');
  console.log('  Security Features:');
  console.log('  - Server-side authentication required');
  console.log('  - No content served without valid login');
  console.log('  - Session cookies with JWT validation');
  console.log(`  - SameSite=strict cookies; Secure=${!LOCALHOST_ONLY}`);
  console.log('');
  console.log('  Access: http://localhost:' + GATEWAY_PORT);
  console.log('============================================================');
  console.log('');
});

export default app;
