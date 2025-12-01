/**
 * Puppeteer Validation Script
 * Tests the complete authentication flow after the proxy fix
 */

import puppeteer from 'puppeteer';

const GATEWAY_URL = 'http://127.0.0.1:9040';
const ADMIN_USERNAME = 'netviz_admin';
const ADMIN_PASSWORD = 'V3ry$trongAdm1n!2025';

async function validateFix() {
  console.log('='.repeat(60));
  console.log('  NetViz Pro - Proxy Fix Validation');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    tests: [],
    passed: 0,
    failed: 0
  };
  
  const addResult = (name, passed, details = '') => {
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
    console.log(`${passed ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
  };
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs and network errors
    const consoleLogs = [];
    const networkErrors = [];
    
    page.on('console', msg => consoleLogs.push(msg.text()));
    page.on('requestfailed', req => {
      networkErrors.push({
        url: req.url(),
        error: req.failure()?.errorText
      });
    });
    
    // ========================================================================
    // TEST 1: Gateway serves login page for unauthenticated users
    // ========================================================================
    console.log('\n--- Test 1: Login Page Access ---');
    await page.goto(GATEWAY_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    
    const loginFormExists = await page.$('form[action="/gateway/login"]') !== null;
    addResult('Login page loads', loginFormExists);
    
    const usernameField = await page.$('input[name="username"]');
    const passwordField = await page.$('input[name="password"]');
    addResult('Login form has username field', usernameField !== null);
    addResult('Login form has password field', passwordField !== null);
    
    // ========================================================================
    // TEST 2: API Proxy - Validate endpoint (unauthenticated)
    // ========================================================================
    console.log('\n--- Test 2: API Proxy Test (Unauthenticated) ---');
    
    const validateResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include'
        });
        return {
          status: res.status,
          body: await res.json()
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    addResult(
      'API /api/auth/validate returns 401 for unauthenticated',
      validateResponse.status === 401,
      `Status: ${validateResponse.status}`
    );
    
    // ========================================================================
    // TEST 3: Login Flow
    // ========================================================================
    console.log('\n--- Test 3: Login Flow ---');
    
    await page.type('input[name="username"]', ADMIN_USERNAME);
    await page.type('input[name="password"]', ADMIN_PASSWORD);
    
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    const currentUrl = page.url();
    const isOnMainApp = !currentUrl.includes('gateway/login');
    addResult('Login redirects to main app', isOnMainApp, `URL: ${currentUrl}`);
    
    // Check if we're past the login page
    const loginFormAfterLogin = await page.$('form[action="/gateway/login"]');
    addResult('No longer on login page', loginFormAfterLogin === null);
    
    // ========================================================================
    // TEST 4: API Proxy - Validate endpoint (authenticated)
    // ========================================================================
    console.log('\n--- Test 4: API Proxy Test (Authenticated) ---');
    
    const validateAuthResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include'
        });
        return {
          status: res.status,
          body: await res.json()
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    addResult(
      'API /api/auth/validate returns 200 for authenticated user',
      validateAuthResponse.status === 200,
      `Status: ${validateAuthResponse.status}`
    );
    
    if (validateAuthResponse.body?.valid) {
      addResult('Session is valid', true, `User: ${validateAuthResponse.body.user?.username}`);
    } else {
      addResult('Session is valid', false, JSON.stringify(validateAuthResponse.body));
    }
    
    // ========================================================================
    // TEST 5: API /api/auth/me endpoint
    // ========================================================================
    console.log('\n--- Test 5: API /api/auth/me ---');
    
    const meResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        return {
          status: res.status,
          body: await res.json()
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    addResult(
      'API /api/auth/me returns user data',
      meResponse.status === 200 && meResponse.body?.username === ADMIN_USERNAME,
      `Username: ${meResponse.body?.username}`
    );
    
    // ========================================================================
    // TEST 6: Check for network errors
    // ========================================================================
    console.log('\n--- Test 6: Network Health ---');
    
    const criticalErrors = networkErrors.filter(e => 
      e.url.includes('/api/') && !e.url.includes('favicon')
    );
    
    addResult(
      'No critical API network errors',
      criticalErrors.length === 0,
      criticalErrors.length > 0 ? `Errors: ${JSON.stringify(criticalErrors)}` : ''
    );
    
    // ========================================================================
    // TEST 7: Logout
    // ========================================================================
    console.log('\n--- Test 7: Logout ---');
    
    await page.goto(`${GATEWAY_URL}/gateway/logout`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // After logout, should be back on login page
    await page.goto(GATEWAY_URL, { waitUntil: 'networkidle0' });
    const loginFormAfterLogout = await page.$('form[action="/gateway/login"]');
    addResult('Logout returns to login page', loginFormAfterLogout !== null);
    
    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('  VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total Tests: ${results.tests.length}`);
    console.log(`  Passed: ${results.passed}`);
    console.log(`  Failed: ${results.failed}`);
    console.log('='.repeat(60));
    
    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The proxy fix is working correctly.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Review the output above.\n');
      console.log('Failed tests:');
      results.tests.filter(t => !t.passed).forEach(t => {
        console.log(`  - ${t.name}: ${t.details}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
  
  return results;
}

validateFix().catch(console.error);
