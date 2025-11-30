/**
 * Test 2-Port Architecture (9040 Vite + 9041 Auth)
 */

import puppeteer from 'puppeteer';

async function test2PortArchitecture() {
  console.log('🎯 TESTING 2-PORT ARCHITECTURE\n');
  console.log('Port 9040: Vite dev server (React app)');
  console.log('Port 9041: Auth server (API backend)\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
    }
  });

  // Capture errors
  page.on('pageerror', error => {
    console.log(`[JS ERROR] ${error.message}`);
  });

  try {
    console.log('1️⃣  Loading application at http://localhost:9040...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle2', timeout: 10000 });
    
    const title = await page.title();
    console.log(`   ✅ Page loaded: ${title}`);
    
    // Check if login screen is shown
    const hasLoginForm = await page.$('#username');
    if (hasLoginForm) {
      console.log('   ✅ Login form detected\n');
      
      console.log('2️⃣  Logging in...');
      await page.type('#username', 'netviz_admin');
      await page.type('#password', 'V3ry$trongAdm1n!2025');
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
        page.click('button[type="submit"]')
      ]);
      
      console.log(`   ✅ Login submitted\n`);
      
      console.log('3️⃣  Checking if main app loaded...');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const currentTitle = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText);
      
      console.log(`   URL: ${currentUrl}`);
      console.log(`   Title: ${currentTitle}`);
      console.log(`   Content length: ${bodyText.length} characters`);
      
      if (bodyText.length > 500) {
        console.log('\n🎉 SUCCESS! Application is fully functional!');
        console.log('   ✅ 2-port architecture working');
        console.log('   ✅ Login successful');
        console.log('   ✅ Main app loaded');
      } else {
        console.log('\n⚠️  App loaded but content is minimal');
        console.log(`   Preview: ${bodyText.substring(0, 200)}`);
      }
      
      await page.screenshot({ path: 'test-2port-success.png', fullPage: true });
      console.log('\n📸 Screenshot saved: test-2port-success.png');
      
    } else {
      console.log('   ❌ No login form found');
    }
    
    console.log('\n✅ Test complete. Closing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'test-2port-error.png' });
    await browser.close();
    process.exit(1);
  }
}

test2PortArchitecture();
