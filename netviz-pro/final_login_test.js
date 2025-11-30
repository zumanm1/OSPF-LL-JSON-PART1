/**
 * Final Login Test - Verify HTTP Redirect Fix
 */

import puppeteer from 'puppeteer';

async function finalLoginTest() {
  console.log('🎯 FINAL LOGIN TEST - HTTP Redirect Fix\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    console.log('1️⃣  Loading login page...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle2' });
    console.log(`   ✅ Page loaded: ${await page.title()}`);
    
    console.log('\n2️⃣  Filling credentials...');
    await page.type('#username', 'netviz_admin');
    await page.type('#password', 'V3ry$trongAdm1n!2025');
    console.log('   ✅ Credentials entered');
    
    console.log('\n3️⃣  Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    const currentUrl = page.url();
    console.log(`\n4️⃣  After login:`);
    console.log(`   URL: ${currentUrl}`);
    console.log(`   Title: ${await page.title()}`);
    
    // Check if we're on the main app (not login page)
    if (currentUrl === 'http://localhost:9040/' || !currentUrl.includes('login')) {
      console.log('   ✅ Successfully redirected to main app!');
      
      // Wait for React app to load
      await page.waitForSelector('body', { timeout: 5000 });
      
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`\n5️⃣  Page content check:`);
      console.log(`   Content length: ${bodyText.length} characters`);
      console.log(`   Preview: ${bodyText.substring(0, 150).replace(/\n/g, ' ')}...`);
      
      // Take screenshot
      await page.screenshot({ path: 'final-login-success.png', fullPage: true });
      console.log('\n📸 Screenshot saved: final-login-success.png');
      
      if (bodyText.length > 100) {
        console.log('\n🎉 SUCCESS! Application loaded after login!');
      } else {
        console.log('\n⚠️  Page loaded but content seems minimal');
      }
    } else {
      console.log('   ❌ Still on login page - redirect failed');
      await page.screenshot({ path: 'final-login-failed.png' });
    }
    
    console.log('\n✅ Test complete. Closing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'final-login-error.png' });
    await browser.close();
    process.exit(1);
  }
}

finalLoginTest();
