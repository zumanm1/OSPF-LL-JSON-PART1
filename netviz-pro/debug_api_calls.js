/**
 * Debug API Calls - Check what's happening with /api/auth/validate
 */

import puppeteer from 'puppeteer';

async function debugApiCalls() {
  console.log('🔍 DEBUGGING API CALLS\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Capture all network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`📤 API REQUEST: ${request.method()} ${request.url()}`);
      const cookies = request.headers()['cookie'];
      if (cookies) {
        console.log(`   Cookies: ${cookies.substring(0, 100)}...`);
      }
    }
  });

  // Capture all network responses
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`📥 API RESPONSE: ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`   Body: ${text.substring(0, 200)}...`);
      } catch (e) {
        console.log(`   (Could not read body)`);
      }
    }
  });

  try {
    console.log('1️⃣  Loading and logging in...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle2' });
    await page.type('#username', 'netviz_admin');
    await page.type('#password', 'V3ry$trongAdm1n!2025');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log(`\n2️⃣  After login - URL: ${page.url()}\n`);
    
    // Wait for React app to try validating
    console.log('3️⃣  Waiting for React app to validate session...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check cookies
    const cookies = await page.cookies();
    console.log(`\n4️⃣  Cookies in browser:`);
    cookies.forEach(cookie => {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });
    
    console.log('\n✅ Debug complete. Check API calls above.');
    console.log('   Press Ctrl+C to close.');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
  }
}

debugApiCalls();
