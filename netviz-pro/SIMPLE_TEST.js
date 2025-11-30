/**
 * SIMPLE TEST - Just check if app loads
 */

import puppeteer from 'puppeteer';

async function simpleTest() {
  console.log('🔍 SIMPLE APP TEST\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    console.log('1️⃣  Loading http://localhost:9040...');
    await page.goto('http://localhost:9040', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}\n`);
    
    await page.screenshot({ path: 'TEST_01_loaded.png', fullPage: true });
    console.log('📸 Screenshot: TEST_01_loaded.png\n');
    
    // Check if it's login page or error
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Content preview: ${bodyText.substring(0, 100)}\n`);
    
    if (bodyText.includes('Username') && bodyText.includes('Password')) {
      console.log('✅ Login page is showing\n');
      
      console.log('2️⃣  Attempting login...');
      await page.type('#username', 'netviz_admin');
      await page.type('#password', 'V3ry$trongAdm1n!2025');
      
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
        page.click('button[type="submit"]')
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterLoginText = await page.evaluate(() => document.body.innerText);
      console.log(`\nAfter login content: ${afterLoginText.substring(0, 150)}\n`);
      
      await page.screenshot({ path: 'TEST_02_after_login.png', fullPage: true });
      console.log('📸 Screenshot: TEST_02_after_login.png\n');
      
      if (afterLoginText.length > 200) {
        console.log('✅ APP IS LOADING!\n');
      } else {
        console.log('⚠️  App might not be loading correctly\n');
      }
    } else if (bodyText.includes('Cannot GET')) {
      console.log('❌ Error page - proxy not working\n');
    }
    
    console.log('Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await page.screenshot({ path: 'TEST_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
}

simpleTest();
