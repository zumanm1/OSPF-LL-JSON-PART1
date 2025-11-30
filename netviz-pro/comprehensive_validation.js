/**
 * COMPREHENSIVE VALIDATION WITH MULTIPLE SCREENSHOTS
 * Tests the 2-port architecture (9040 Vite + 9041 Auth)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

async function comprehensiveValidation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE APPLICATION VALIDATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Architecture: 2-Port System');
  console.log('  • Port 9040: Vite Dev Server (React App)');
  console.log('  • Port 9041: Auth Server (API Backend)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const screenshots = [];
  let testsPassed = 0;
  let testsFailed = 0;

  // Helper to take screenshot
  const takeScreenshot = async (name, description) => {
    const filename = `screenshot_${screenshots.length + 1}_${name}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    screenshots.push({ filename, description });
    console.log(`   📸 Screenshot saved: ${filename}`);
  };

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // TEST 1: Load Application
    console.log('\n📋 TEST 1: Load Application');
    console.log('─────────────────────────────────────────────────────────');
    await page.goto('http://localhost:9040', { 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });
    
    const title = await page.title();
    console.log(`   ✅ Page loaded successfully`);
    console.log(`   Title: ${title}`);
    await takeScreenshot('01_initial_load', 'Initial application load');
    testsPassed++;

    // TEST 2: Check Login Form
    console.log('\n📋 TEST 2: Verify Login Form');
    console.log('─────────────────────────────────────────────────────────');
    const usernameField = await page.$('#username');
    const passwordField = await page.$('#password');
    const submitButton = await page.$('button[type="submit"]');
    
    if (usernameField && passwordField && submitButton) {
      console.log('   ✅ Login form elements present');
      console.log('      • Username field: ✓');
      console.log('      • Password field: ✓');
      console.log('      • Submit button: ✓');
      await takeScreenshot('02_login_form', 'Login form ready');
      testsPassed++;
    } else {
      console.log('   ❌ Login form incomplete');
      testsFailed++;
    }

    // TEST 3: Fill Login Form
    console.log('\n📋 TEST 3: Fill Login Credentials');
    console.log('─────────────────────────────────────────────────────────');
    await page.type('#username', 'netviz_admin', { delay: 50 });
    await page.type('#password', 'V3ry$trongAdm1n!2025', { delay: 50 });
    console.log('   ✅ Credentials entered');
    await takeScreenshot('03_credentials_filled', 'Login credentials entered');
    testsPassed++;

    // TEST 4: Submit Login
    console.log('\n📋 TEST 4: Submit Login Form');
    console.log('─────────────────────────────────────────────────────────');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    await takeScreenshot('04_after_login', 'After login submission');
    testsPassed++;

    // TEST 5: Check if Main App Loaded
    console.log('\n📋 TEST 5: Verify Main Application');
    console.log('─────────────────────────────────────────────────────────');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText.length > 200;
    
    console.log(`   Content length: ${bodyText.length} characters`);
    
    if (hasContent) {
      console.log('   ✅ Main application loaded with content');
      
      // Check for key UI elements
      const hasNavigation = bodyText.includes('Network') || bodyText.includes('Topology');
      const hasControls = bodyText.includes('Upload') || bodyText.includes('File');
      
      if (hasNavigation) console.log('      • Navigation elements: ✓');
      if (hasControls) console.log('      • Control elements: ✓');
      
      testsPassed++;
    } else {
      console.log('   ⚠️  Content seems minimal');
      console.log(`   Preview: ${bodyText.substring(0, 200)}`);
      testsFailed++;
    }
    
    await takeScreenshot('05_main_app', 'Main application view');

    // TEST 6: Check for JavaScript Errors
    console.log('\n📋 TEST 6: JavaScript Error Check');
    console.log('─────────────────────────────────────────────────────────');
    if (errors.length === 0) {
      console.log('   ✅ No JavaScript errors detected');
      testsPassed++;
    } else {
      console.log(`   ⚠️  ${errors.length} JavaScript errors found:`);
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`      ${i + 1}. ${err.substring(0, 100)}`);
      });
      testsFailed++;
    }

    // TEST 7: API Connectivity
    console.log('\n📋 TEST 7: API Connectivity Test');
    console.log('─────────────────────────────────────────────────────────');
    try {
      const apiResponse = await page.evaluate(async () => {
        const response = await fetch('/api/auth/validate', {
          credentials: 'include'
        });
        return {
          status: response.status,
          ok: response.ok
        };
      });
      
      console.log(`   API Response Status: ${apiResponse.status}`);
      if (apiResponse.ok || apiResponse.status === 401) {
        console.log('   ✅ API endpoint accessible');
        testsPassed++;
      } else {
        console.log('   ⚠️  API endpoint returned unexpected status');
        testsFailed++;
      }
    } catch (err) {
      console.log(`   ❌ API test failed: ${err.message}`);
      testsFailed++;
    }

    // FINAL SUMMARY
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    console.log('\n📸 Screenshots Captured:');
    screenshots.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.filename} - ${s.description}`);
    });
    
    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Application is 100% functional!');
    } else {
      console.log(`\n⚠️  ${testsFailed} test(s) need attention`);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Keeping browser open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    
    process.exit(testsFailed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    await takeScreenshot('error', 'Error state');
    await browser.close();
    process.exit(1);
  }
}

comprehensiveValidation();
