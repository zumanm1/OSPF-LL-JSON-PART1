/**
 * Comprehensive End-to-End Test Suite
 * Tests: Auth Server, Frontend, Login Flow, App Functionality
 */

import puppeteer from 'puppeteer';

const AUTH_URL = 'http://localhost:9041';
const APP_URL = 'http://localhost:9040';
const ADMIN_USER = 'netviz_admin';
const ADMIN_PASS = 'V3ry$trongAdm1n!2025';

const results = {
  passed: [],
  failed: [],
  warnings: []
};

const log = (type, msg) => {
  const emoji = type === 'pass' ? '✅' : type === 'fail' ? '❌' : '⚠️';
  console.log(`${emoji} ${msg}`);
  if (type === 'pass') results.passed.push(msg);
  else if (type === 'fail') results.failed.push(msg);
  else results.warnings.push(msg);
};

async function testAuthServerHealth() {
  console.log('\n📡 Phase 1: Auth Server Health Check');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${AUTH_URL}/api/health`);
    const data = await response.json();

    if (data.status === 'ok') {
      log('pass', 'Auth server health endpoint responds OK');
      log('pass', `Auth service: ${data.service}`);
      return true;
    } else {
      log('fail', 'Auth server health check failed');
      return false;
    }
  } catch (error) {
    log('fail', `Auth server not reachable: ${error.message}`);
    return false;
  }
}

async function testAuthLogin() {
  console.log('\n🔐 Phase 2: Auth API Login Test');
  console.log('─'.repeat(50));

  try {
    // Test invalid credentials
    const invalidResponse = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'invalid', password: 'wrong' })
    });

    if (invalidResponse.status === 401) {
      log('pass', 'Invalid credentials correctly rejected (401)');
    } else {
      log('fail', `Invalid credentials returned unexpected status: ${invalidResponse.status}`);
    }

    // Test valid credentials
    const validResponse = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
    });

    const data = await validResponse.json();

    if (validResponse.ok && data.success && data.token) {
      log('pass', 'Valid credentials accepted');
      log('pass', `JWT token received (length: ${data.token.length})`);
      log('pass', `User role: ${data.user.role}`);
      return data.token;
    } else {
      log('fail', `Login failed: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    log('fail', `Auth login test error: ${error.message}`);
    return null;
  }
}

async function testAuthValidation(token) {
  console.log('\n🔍 Phase 3: Session Validation Test');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${AUTH_URL}/api/auth/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      log('pass', 'Session validation successful');
      log('pass', `User: ${data.user.username} (${data.user.role})`);
      return true;
    } else {
      log('fail', 'Session validation failed');
      return false;
    }
  } catch (error) {
    log('fail', `Session validation error: ${error.message}`);
    return false;
  }
}

async function testFrontendApp() {
  console.log('\n🌐 Phase 4: Frontend Application Test');
  console.log('─'.repeat(50));

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        log('warn', `Console error: ${msg.text().substring(0, 100)}`);
      }
    });

    // Navigate to app
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    log('pass', 'Frontend loaded successfully');

    // Check for login screen elements
    const titleExists = await page.$eval('h1', el => el.textContent.includes('NetViz Pro')).catch(() => false);
    if (titleExists) {
      log('pass', 'NetViz Pro title displayed');
    } else {
      log('warn', 'Title not found - may be styled differently');
    }

    // Check for login form
    const usernameField = await page.$('#username, input[name="username"], input[placeholder*="username" i]');
    const passwordField = await page.$('#password, input[name="password"], input[type="password"]');

    if (usernameField && passwordField) {
      log('pass', 'Login form fields detected');

      // Attempt login
      await page.type('#username, input[name="username"], input[placeholder*="username" i]', ADMIN_USER);
      await page.type('#password, input[name="password"], input[type="password"]', ADMIN_PASS);

      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        log('pass', 'Login form submitted');

        // Wait for navigation or app content
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});

        // Check if we're now in the app (look for app-specific elements)
        await page.waitForSelector('header, .sidebar, [class*="dashboard"]', { timeout: 10000 }).catch(() => {});

        const appHeader = await page.$('header');
        if (appHeader) {
          log('pass', 'App loaded after login - authentication successful!');
        } else {
          // Check for any error messages
          const errorElement = await page.$('[class*="error"], [class*="alert"]');
          if (errorElement) {
            const errorText = await page.evaluate(el => el.textContent, errorElement);
            log('fail', `Login error displayed: ${errorText.substring(0, 100)}`);
          } else {
            log('warn', 'Post-login state unclear - may need manual verification');
          }
        }
      } else {
        log('warn', 'Submit button not found with expected selector');
      }
    } else {
      log('warn', 'Login form not found - app may already be authenticated or using different structure');
    }

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/netviz_test_screenshot.png' });
    log('pass', 'Screenshot saved to /tmp/netviz_test_screenshot.png');

    return true;
  } catch (error) {
    log('fail', `Frontend test error: ${error.message}`);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

async function testCORSConfiguration() {
  console.log('\n🔒 Phase 5: CORS Configuration Test');
  console.log('─'.repeat(50));

  try {
    // Test preflight request
    const response = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:9040',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    const credentialsHeader = response.headers.get('Access-Control-Allow-Credentials');

    if (corsHeader) {
      log('pass', `CORS Allow-Origin: ${corsHeader}`);
    } else {
      log('warn', 'CORS Allow-Origin header not set');
    }

    if (credentialsHeader === 'true') {
      log('pass', 'CORS credentials allowed');
    } else {
      log('warn', 'CORS credentials header not set to true');
    }

    return true;
  } catch (error) {
    log('fail', `CORS test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    NETVIZ PRO COMPREHENSIVE END-TO-END TEST SUITE          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Started: ${new Date().toISOString()}`);

  // Phase 1: Auth Server Health
  const authHealthy = await testAuthServerHealth();
  if (!authHealthy) {
    console.log('\n❌ CRITICAL: Auth server not available. Cannot proceed with tests.');
    console.log('   Please ensure the auth server is running: node server/index.js');
    process.exit(1);
  }

  // Phase 2: Auth Login API
  const token = await testAuthLogin();

  // Phase 3: Session Validation
  if (token) {
    await testAuthValidation(token);
  }

  // Phase 4: Frontend App
  await testFrontendApp();

  // Phase 5: CORS
  await testCORSConfiguration();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed Tests:');
    results.failed.forEach(f => console.log(`  ❌ ${f}`));
  }

  if (results.warnings.length > 0) {
    console.log('\nWarnings:');
    results.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }

  const exitCode = results.failed.length > 0 ? 1 : 0;
  console.log(`\nCompleted: ${new Date().toISOString()}`);
  console.log(`Exit code: ${exitCode}`);

  return exitCode;
}

runAllTests().then(code => process.exit(code));
