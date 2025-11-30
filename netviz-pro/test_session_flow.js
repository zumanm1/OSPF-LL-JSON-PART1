/**
 * Test the complete session flow
 */

import puppeteer from 'puppeteer';

async function testSessionFlow() {
  console.log('🔍 TESTING SESSION FLOW\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  // Intercept network requests
  const requests = [];
  const responses = [];
  
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('/gateway/')) {
      try {
        const text = await response.text();
        responses.push({
          url,
          status: response.status(),
          headers: response.headers(),
          body: text.substring(0, 500)
        });
      } catch (e) {
        responses.push({
          url,
          status: response.status(),
          error: 'Could not read body'
        });
      }
    }
  });

  try {
    console.log('1️⃣  Loading login page...');
    await page.goto('http://localhost:9040', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('✅ Login page loaded\n');
    
    console.log('2️⃣  Logging in...');
    await page.type('#username', 'netviz_admin');
    await page.type('#password', 'V3ry$trongAdm1n!2025');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('✅ Login submitted\n');
    
    // Wait for any API calls
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('3️⃣  Checking cookies...');
    const cookies = await page.cookies();
    console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    console.log('');
    
    console.log('4️⃣  Network Activity:');
    console.log('\nAPI Requests:');
    requests.filter(r => r.url.includes('/api/')).forEach(r => {
      console.log(`   ${r.method} ${r.url}`);
      if (r.headers.cookie) {
        console.log(`      Cookie: ${r.headers.cookie.substring(0, 50)}...`);
      }
    });
    
    console.log('\nAPI Responses:');
    responses.forEach(r => {
      console.log(`   ${r.status} ${r.url}`);
      if (r.body) {
        console.log(`      Body: ${r.body.substring(0, 100)}`);
      }
    });
    
    await page.screenshot({ path: 'SESSION_FLOW_TEST.png', fullPage: true });
    console.log('\n📸 Screenshot: SESSION_FLOW_TEST.png');
    
    console.log('\nBrowser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'SESSION_FLOW_ERROR.png' });
    await browser.close();
    process.exit(1);
  }
}

testSessionFlow();
