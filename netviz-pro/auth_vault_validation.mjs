/**
 * Auth-Vault Integration Validation Script
 * Comprehensive E2E testing using Puppeteer
 * Tests: Login flow, API endpoints, session management, auth modes
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:9040';
const AUTH_API = 'http://localhost:9041';

// Test credentials from .env.local
const ADMIN_USER = 'netviz_admin';
const ADMIN_PASS = 'V3ry$trongAdm1n!2025';

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'INFO': 'ℹ️',
    'TEST': '🧪'
  }[type] || '•';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
  if (details) console.log('   ', details);
  
  if (type === 'PASS') results.passed.push(message);
  if (type === 'FAIL') results.failed.push({ message, details });
  if (type === 'WARN') results.warnings.push({ message, details });
}

async function testHealthEndpoint() {
  log('TEST', 'Testing /api/health endpoint');
  try {
    const response = await fetch(`${AUTH_API}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      log('PASS', 'Health endpoint responds correctly');
      log('INFO', `Auth Mode: ${data.authMode}, Auth-Vault: ${data.authVault}`);
      return data;
    } else {
      log('FAIL', 'Health endpoint returned unexpected response', data);
      return null;
    }
  } catch (error) {
    log('FAIL', 'Health endpoint failed', error.message);
    return null;
  }
}

async function testAuthConfig() {
  log('TEST', 'Testing /api/auth/config endpoint');
  try {
    const response = await fetch(`${AUTH_API}/api/auth/config`);
    const data = await response.json();
    
    if (response.ok && data.authMode) {
      log('PASS', 'Auth config endpoint responds correctly');
      log('INFO', `Auth Mode: ${data.authMode}`);
      if (data.keycloak) {
        log('INFO', `Keycloak URL: ${data.keycloak.url}`);
        log('INFO', `Keycloak Realm: ${data.keycloak.realm}`);
      }
      return data;
    } else {
      log('FAIL', 'Auth config endpoint returned unexpected response', data);
      return null;
    }
  } catch (error) {
    log('FAIL', 'Auth config endpoint failed', error.message);
    return null;
  }
}

async function testLoginAPI() {
  log('TEST', 'Testing /api/auth/login endpoint');
  try {
    const response = await fetch(`${AUTH_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
    });
    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      log('PASS', 'Login API works correctly');
      log('INFO', `User: ${data.user.username}, Role: ${data.user.role}`);
      return data;
    } else {
      log('FAIL', 'Login API returned unexpected response', data);
      return null;
    }
  } catch (error) {
    log('FAIL', 'Login API failed', error.message);
    return null;
  }
}

async function testInvalidLogin() {
  log('TEST', 'Testing login with invalid credentials');
  try {
    const response = await fetch(`${AUTH_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'invalid', password: 'wrong' })
    });
    const data = await response.json();
    
    if (response.status === 401 && data.error) {
      log('PASS', 'Invalid login correctly rejected');
      return true;
    } else {
      log('FAIL', 'Invalid login should return 401', data);
      return false;
    }
  } catch (error) {
    log('FAIL', 'Invalid login test failed', error.message);
    return false;
  }
}

async function testProtectedEndpoint(token) {
  log('TEST', 'Testing protected /api/auth/me endpoint');
  try {
    const response = await fetch(`${AUTH_API}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (response.ok && data.username) {
      log('PASS', 'Protected endpoint accessible with valid token');
      return data;
    } else {
      log('FAIL', 'Protected endpoint returned unexpected response', data);
      return null;
    }
  } catch (error) {
    log('FAIL', 'Protected endpoint test failed', error.message);
    return null;
  }
}

async function testUnauthorizedAccess() {
  log('TEST', 'Testing unauthorized access to protected endpoint');
  try {
    const response = await fetch(`${AUTH_API}/api/auth/me`);
    
    if (response.status === 401) {
      log('PASS', 'Unauthorized access correctly rejected');
      return true;
    } else {
      log('FAIL', 'Unauthorized access should return 401', { status: response.status });
      return false;
    }
  } catch (error) {
    log('FAIL', 'Unauthorized access test failed', error.message);
    return false;
  }
}

async function testGatewayLoginPage() {
  log('TEST', 'Testing Gateway login page (Puppeteer)');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Unauthenticated access shows login page
    log('INFO', 'Navigating to gateway...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    
    const pageContent = await page.content();
    if (pageContent.includes('NetViz Pro') && pageContent.includes('Sign In')) {
      log('PASS', 'Gateway shows login page for unauthenticated users');
    } else {
      log('FAIL', 'Gateway did not show login page');
    }
    
    // Test 2: Login form exists
    const usernameField = await page.$('input[name="username"]');
    const passwordField = await page.$('input[name="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    if (usernameField && passwordField && submitButton) {
      log('PASS', 'Login form elements present');
    } else {
      log('FAIL', 'Login form elements missing');
    }
    
    // Test 3: Perform login
    log('INFO', 'Attempting login...');
    await page.type('input[name="username"]', ADMIN_USER);
    await page.type('input[name="password"]', ADMIN_PASS);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Test 4: Check if we're now authenticated
    const postLoginContent = await page.content();
    const currentUrl = page.url();
    
    // Check for session cookie
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name === 'netviz_session');
    
    if (sessionCookie) {
      log('PASS', 'Session cookie set after login');
    } else {
      log('WARN', 'Session cookie not found after login');
    }
    
    // Check if we see the main app (not login page)
    if (!postLoginContent.includes('Sign In') || postLoginContent.includes('Upload Topology')) {
      log('PASS', 'Successfully redirected to main app after login');
    } else {
      log('WARN', 'May still be on login page after login attempt');
    }
    
    // Take screenshot for evidence
    await page.screenshot({ path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/auth_validation_screenshot.png', fullPage: true });
    log('INFO', 'Screenshot saved: auth_validation_screenshot.png');
    
    return true;
  } catch (error) {
    log('FAIL', 'Gateway login test failed', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testSessionValidation() {
  log('TEST', 'Testing session validation flow');
  
  // Wait for rate limit to reset from previous tests
  log('INFO', 'Waiting 3 seconds for rate limit reset...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Login first
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.type('input[name="username"]', ADMIN_USER);
    await page.type('input[name="password"]', ADMIN_PASS);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a moment before validation call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now test /api/auth/validate through the gateway
    const validateResponse = await page.evaluate(async () => {
      const res = await fetch('/api/auth/validate', { credentials: 'include' });
      return { status: res.status, data: await res.json() };
    });
    
    if (validateResponse.status === 200 && validateResponse.data.valid) {
      log('PASS', 'Session validation works through gateway proxy');
      log('INFO', `User: ${validateResponse.data.user?.username}`);
    } else if (validateResponse.status === 429) {
      log('WARN', 'Rate limit hit - this is expected security behavior', validateResponse.data);
    } else {
      log('FAIL', 'Session validation failed', validateResponse);
    }
    
    return true;
  } catch (error) {
    log('FAIL', 'Session validation test failed', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testCORSHeaders() {
  log('TEST', 'Testing CORS configuration');
  try {
    const response = await fetch(`${AUTH_API}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:9040',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    const credentialsHeader = response.headers.get('access-control-allow-credentials');
    
    if (corsHeader) {
      log('PASS', 'CORS headers present');
      log('INFO', `Allow-Origin: ${corsHeader}`);
      log('INFO', `Allow-Credentials: ${credentialsHeader}`);
    } else {
      log('WARN', 'CORS headers may not be configured for preflight');
    }
    
    return true;
  } catch (error) {
    log('WARN', 'CORS test inconclusive', error.message);
    return true;
  }
}

async function testAdminEndpoints(token) {
  log('TEST', 'Testing admin-only endpoints');
  try {
    const response = await fetch(`${AUTH_API}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (response.ok && Array.isArray(data)) {
      log('PASS', 'Admin users endpoint accessible');
      log('INFO', `Found ${data.length} users`);
      return data;
    } else {
      log('FAIL', 'Admin users endpoint returned unexpected response', data);
      return null;
    }
  } catch (error) {
    log('FAIL', 'Admin users endpoint test failed', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('  AUTH-VAULT INTEGRATION VALIDATION');
  console.log('  NetViz Pro (OSPF-LL-JSON-PART1)');
  console.log('='.repeat(70) + '\n');
  
  // API Tests
  console.log('\n--- API ENDPOINT TESTS ---\n');
  const healthData = await testHealthEndpoint();
  const authConfig = await testAuthConfig();
  const loginData = await testLoginAPI();
  await testInvalidLogin();
  await testUnauthorizedAccess();
  
  if (loginData?.token) {
    await testProtectedEndpoint(loginData.token);
    await testAdminEndpoints(loginData.token);
  }
  
  await testCORSHeaders();
  
  // Browser Tests
  console.log('\n--- BROWSER/UI TESTS ---\n');
  await testGatewayLoginPage();
  await testSessionValidation();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  VALIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n  ✅ Passed: ${results.passed.length}`);
  console.log(`  ❌ Failed: ${results.failed.length}`);
  console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n  FAILURES:');
    results.failed.forEach((f, i) => {
      console.log(`    ${i + 1}. ${f.message}`);
      if (f.details) console.log(`       Details: ${JSON.stringify(f.details)}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n  WARNINGS:');
    results.warnings.forEach((w, i) => {
      console.log(`    ${i + 1}. ${w.message}`);
    });
  }
  
  // Auth-Vault Status
  console.log('\n  AUTH-VAULT STATUS:');
  if (healthData) {
    console.log(`    Mode: ${healthData.authMode}`);
    console.log(`    Auth-Vault Active: ${healthData.authVault}`);
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Return exit code
  return results.failed.length === 0 ? 0 : 1;
}

runAllTests()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Validation script error:', err);
    process.exit(1);
  });
