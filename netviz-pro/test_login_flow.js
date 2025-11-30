/**
 * Test Login Flow with Cookie Persistence
 */

import puppeteer from 'puppeteer';

async function testLoginFlow() {
  console.log('🧪 Testing Login Flow with Cookie Persistence\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Enable request/response logging
  page.on('request', request => {
    const cookies = request.headers()['cookie'] || 'NO COOKIES';
    console.log(`📤 ${request.method()} ${request.url()}`);
    console.log(`   Cookies: ${cookies.substring(0, 100)}...`);
  });

  page.on('response', response => {
    const setCookie = response.headers()['set-cookie'] || 'NO SET-COOKIE';
    if (setCookie !== 'NO SET-COOKIE') {
      console.log(`📥 Response from ${response.url()}`);
      console.log(`   Set-Cookie: ${setCookie.substring(0, 100)}...`);
    }
  });

  try {
    console.log('1️⃣  Loading login page...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle2' });
    
    console.log('\n2️⃣  Filling login form...');
    await page.type('#username', 'netviz_admin');
    await page.type('#password', 'V3ry$trongAdm1n!2025');
    
    console.log('\n3️⃣  Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('\n4️⃣  After login redirect...');
    console.log(`   Current URL: ${page.url()}`);
    
    // Check cookies
    const cookies = await page.cookies();
    console.log(`\n5️⃣  Cookies in browser:`);
    cookies.forEach(cookie => {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      console.log(`     Domain: ${cookie.domain}, Path: ${cookie.path}, HttpOnly: ${cookie.httpOnly}`);
    });
    
    // Wait a bit and check page content
    await page.waitForTimeout(2000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`\n6️⃣  Page content preview:`);
    console.log(`   ${bodyText.substring(0, 200)}...`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-login-flow.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-login-flow.png');
    
    console.log('\n✅ Test complete. Browser will stay open for inspection.');
    console.log('   Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'test-login-error.png' });
    await browser.close();
  }
}

testLoginFlow();
