/**
 * Puppeteer Validation with Screenshots
 * Tests application functionality and captures visual proof
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:9040';
const ADMIN_USER = 'netviz_admin';
const ADMIN_PASS = 'V3ry$trongAdm1n!2025';

// Create screenshots directory
const screenshotsDir = path.join(process.cwd(), 'validation-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

async function captureScreenshot(page, name) {
  const filename = path.join(screenshotsDir, `${timestamp}_${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

async function validateAppRunning() {
  console.log('🚀 PUPPETEER VALIDATION - NetViz Pro');
  console.log('═'.repeat(70));
  console.log(`Testing: ${APP_URL}`);
  console.log(`Screenshots: ${screenshotsDir}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = {
    passed: [],
    failed: [],
    screenshots: []
  };

  try {
    // TEST 1: Application Loads
    console.log('📋 TEST 1: Checking if application loads...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const screenshot1 = await captureScreenshot(page, '01_login_page');
    results.screenshots.push(screenshot1);
    
    const title = await page.title();
    if (title.includes('NetViz Pro')) {
      console.log('✅ PASS: Application loaded successfully');
      console.log(`   Title: ${title}`);
      results.passed.push('Application loads');
    } else {
      console.log('❌ FAIL: Unexpected page title');
      results.failed.push('Application loads');
    }

    // TEST 2: Security Headers Present
    console.log('\n📋 TEST 2: Checking security headers...');
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    const headers = response.headers();
    
    const securityHeaders = {
      'content-security-policy': headers['content-security-policy'],
      'strict-transport-security': headers['strict-transport-security'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options']
    };

    let headersValid = true;
    for (const [header, value] of Object.entries(securityHeaders)) {
      if (value) {
        console.log(`✅ ${header}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`❌ ${header}: MISSING`);
        headersValid = false;
      }
    }

    if (headersValid) {
      results.passed.push('Security headers present');
    } else {
      results.failed.push('Security headers present');
    }

    // TEST 3: Login Form Present
    console.log('\n📋 TEST 3: Checking login form...');
    const usernameInput = await page.$('#username');
    const passwordInput = await page.$('#password');
    const loginButton = await page.$('button[type="submit"]');

    if (usernameInput && passwordInput && loginButton) {
      console.log('✅ PASS: Login form elements present');
      results.passed.push('Login form present');
    } else {
      console.log('❌ FAIL: Login form elements missing');
      results.failed.push('Login form present');
    }

    // TEST 4: Login Functionality
    console.log('\n📋 TEST 4: Testing login functionality...');
    await page.type('#username', ADMIN_USER);
    await page.type('#password', ADMIN_PASS);
    
    const screenshot2 = await captureScreenshot(page, '02_login_filled');
    results.screenshots.push(screenshot2);

    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      const screenshot3 = await captureScreenshot(page, '03_after_login');
      results.screenshots.push(screenshot3);

      const currentUrl = page.url();
      if (currentUrl === APP_URL + '/' || !currentUrl.includes('login')) {
        console.log('✅ PASS: Login successful, redirected to main app');
        results.passed.push('Login functionality');
      } else {
        console.log('❌ FAIL: Login did not redirect properly');
        results.failed.push('Login functionality');
      }
    } catch (err) {
      console.log('❌ FAIL: Login navigation timeout');
      results.failed.push('Login functionality');
      const screenshot3 = await captureScreenshot(page, '03_login_error');
      results.screenshots.push(screenshot3);
    }

    // TEST 5: Main Application UI
    console.log('\n📋 TEST 5: Checking main application UI...');
    await page.waitForTimeout(2000); // Wait for app to load

    const screenshot4 = await captureScreenshot(page, '04_main_app');
    results.screenshots.push(screenshot4);

    // Check for key UI elements
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (bodyText.includes('NetViz Pro') || bodyText.includes('Network') || bodyText.includes('Topology')) {
      console.log('✅ PASS: Main application UI loaded');
      results.passed.push('Main application UI');
    } else {
      console.log('❌ FAIL: Main application UI not detected');
      results.failed.push('Main application UI');
    }

    // TEST 6: Check for JavaScript Errors
    console.log('\n📋 TEST 6: Checking for JavaScript errors...');
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.waitForTimeout(2000);

    if (jsErrors.length === 0) {
      console.log('✅ PASS: No JavaScript errors detected');
      results.passed.push('No JavaScript errors');
    } else {
      console.log(`❌ FAIL: ${jsErrors.length} JavaScript errors detected`);
      jsErrors.forEach(err => console.log(`   - ${err}`));
      results.failed.push('No JavaScript errors');
    }

    // Final screenshot
    const screenshot5 = await captureScreenshot(page, '05_final_state');
    results.screenshots.push(screenshot5);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    const screenshot = await captureScreenshot(page, 'error_state');
    results.screenshots.push(screenshot);
    results.failed.push('Critical error: ' + error.message);
  } finally {
    await browser.close();
  }

  // Print Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 VALIDATION SUMMARY');
  console.log('═'.repeat(70));
  
  console.log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   ✓ ${test}`));
  
  console.log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach(test => console.log(`   ✗ ${test}`));

  console.log(`\n📸 SCREENSHOTS: ${results.screenshots.length}`);
  results.screenshots.forEach(file => console.log(`   📷 ${file}`));

  const totalTests = results.passed.length + results.failed.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);
  
  console.log(`\n🎯 Success Rate: ${passRate}%`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Application is fully operational!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review screenshots for details.');
    process.exit(1);
  }
}

// Run validation
validateAppRunning().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
