/**
 * CRITICAL PRODUCTION SECURITY MIDDLEWARE
 * Provides comprehensive security for NetViz Pro Express servers
 * 
 * FEATURES:
 * - Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Rate limiting for authentication endpoints
 * - Request validation and sanitization
 * - Audit logging for admin actions
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// CRITICAL PRODUCTION SECURITY: Content Security Policy for D3.js app
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // No inline scripts - prevents XSS
    styleSrc: ["'self'", "'unsafe-inline'"], // D3.js requires inline styles
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: [
      "'self'", 
      process.env.AUTH_URL || 'http://localhost:9041', 
      process.env.VITE_URL || 'http://localhost:9042',
      process.env.GATEWAY_URL || 'http://localhost:9040'
    ], // Environment-driven API connections
    fontSrc: ["'self'"],
    objectSrc: ["'none'"], // Prevents object embedding attacks
    baseUri: ["'self'"], // Prevents base tag attacks
    frameAncestors: ["'none'"], // Prevents clickjacking
    formAction: ["'self'"],
    frameSrc: ["'none'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    upgradeInsecureRequests: [] // For future HTTPS deployment
  }
};

// CRITICAL PRODUCTION SECURITY: Rate limiting configuration
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests to reduce noise
    skipSuccessfulRequests: false,
    // Store attempts in memory (reset on server restart)
    handler: (req, res) => {
      console.warn(`[SECURITY] Rate limit exceeded from ${req.ip} on ${req.path}`);
      res.status(429).json({ error: message });
    }
  });
};

// CRITICAL PRODUCTION SECURITY: Audit logging middleware
export const auditLogger = (action) => {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const user = req.user?.username || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    
    const auditEntry = {
      timestamp,
      action,
      user,
      ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      success: false // Will be updated on success
    };

    // Log to console for now (in production, use append-only file or database)
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);

    // Attach audit entry to request for success tracking
    req.auditEntry = auditEntry;
    
    // Override res.json to log successful responses
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        auditEntry.success = true;
        console.log(`[AUDIT] SUCCESS: ${JSON.stringify(auditEntry)}`);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// CRITICAL PRODUCTION SECURITY: Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim().slice(0, 1000); // Limit length
      }
    });
  }

  // Validate request body size for JSON endpoints
  if (req.body && JSON.stringify(req.body).length > 1024 * 1024) { // 1MB limit
    return res.status(413).json({ error: 'Request body too large' });
  }

  next();
};

// CRITICAL PRODUCTION SECURITY: Pre-configured rate limiters
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts. Please try again later.'
);

export const adminRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 admin actions per hour
  'Too many admin actions. Please wait before continuing.'
);

export const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 uploads per minute
  'Too many file uploads. Please wait before uploading again.'
);

// CRITICAL PRODUCTION SECURITY: Strict rate limiter for PIN-protected public endpoint
export const pinProtectedRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts per hour (very strict for public endpoint)
  'Too many admin reset attempts. This incident will be logged.'
);

// CRITICAL PRODUCTION SECURITY: Main security middleware
export const securityMiddleware = [
  // Helmet with custom CSP for D3.js
  helmet({
    contentSecurityPolicy: cspConfig,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true, // Prevent MIME type sniffing
    frameguard: { action: 'deny' }, // Prevent clickjacking
    xssFilter: true, // XSS protection
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }),

  // Input sanitization
  sanitizeInput,

  // General rate limiting (100 requests per minute)
  createRateLimit(
    60 * 1000, // 1 minute
    100, // 100 requests per minute
    'Rate limit exceeded. Please slow down.'
  )
];

// CRITICAL PRODUCTION SECURITY: Authentication-specific middleware
export const authSecurityMiddleware = [
  auditLogger('authentication_attempt'),
  authRateLimit
];

// CRITICAL PRODUCTION SECURITY: Admin-specific middleware
export const adminSecurityMiddleware = [
  auditLogger('admin_action'),
  adminRateLimit
];

// CRITICAL PRODUCTION SECURITY: File upload middleware
export const uploadSecurityMiddleware = [
  auditLogger('file_upload'),
  uploadRateLimit
];
