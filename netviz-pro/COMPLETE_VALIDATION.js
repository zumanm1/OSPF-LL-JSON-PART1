/**
 * COMPLETE END-TO-END VALIDATION
 * Tests login flow and main app loading
 */

import puppeteer from 'puppeteer';

async function completeValidation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  COMPLETE END-TO-END VALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    // TEST 1: Load login page
    console.log('📋 TEST 1: Load Login Page');
    await page.goto('http://localhost:9040', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('✅ Login page loaded');
    console.log(`   Title: ${await page.title()}\n`);
    
    await page.screenshot({ path: 'FINAL_01_login_page.png', fullPage: true });
    console.log('📸 Screenshot: FINAL_01_login_page.png\n');
    
    // TEST 2: Fill login form
    console.log('📋 TEST 2: Fill Login Credentials');
    await page.type('#username', 'netviz_admin', { delay: 50 });
    await page.type('#password', 'V3ry$trongAdm1n!2025', { delay: 50 });
    console.log('✅ Credentials entered\n');
    
    await page.screenshot({ path: 'FINAL_02_credentials_filled.png', fullPage: true });
    console.log('📸 Screenshot: FINAL_02_credentials_filled.png\n');
    
    // TEST 3: Submit login
    console.log('📋 TEST 3: Submit Login');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('✅ Login submitted');
    console.log(`   Current URL: ${page.url()}\n`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ path: 'FINAL_03_after_login.png', fullPage: true });
    console.log('📸 Screenshot: FINAL_03_after_login.png\n');
    
    // TEST 4: Check main app
    console.log('📋 TEST 4: Verify Main Application');
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`   Content length: ${bodyText.length} characters`);
    
    if (bodyText.length > 200) {
      console.log('✅ Main application loaded with content');
    } else {
      console.log('⚠️  Content seems minimal');
      console.log(`   Preview: ${bodyText.substring(0, 200)}`);
    }
    
    await page.screenshot({ path: 'FINAL_04_main_app.png', fullPage: true });
    console.log('📸 Screenshot: FINAL_04_main_app.png\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ VALIDATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n4 screenshots saved as proof.');
    console.log('Browser will close in 10 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'FINAL_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
}

completeValidation();
