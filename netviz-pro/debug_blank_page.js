/**
 * Debug Blank Page Issue - Check Console Errors
 */

import puppeteer from 'puppeteer';

async function debugBlankPage() {
  console.log('🔍 DEBUGGING BLANK PAGE ISSUE\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
  });

  // Capture JavaScript errors
  page.on('pageerror', error => {
    console.log(`[BROWSER ERROR] ${error.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  // Capture CSP violations
  page.on('response', response => {
    const csp = response.headers()['content-security-policy'];
    if (csp && response.url() === 'http://localhost:9040/') {
      console.log(`\n📋 CSP Header: ${csp.substring(0, 200)}...\n`);
    }
  });

  try {
    console.log('1️⃣  Logging in...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle2' });
    await page.type('#username', 'netviz_admin');
    await page.type('#password', 'V3ry$trongAdm1n!2025');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log(`\n2️⃣  After login - URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}\n`);
    
    // Wait for potential React rendering
    console.log('3️⃣  Waiting 5 seconds for React to render...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check HTML structure
    const html = await page.content();
    console.log(`4️⃣  HTML length: ${html.length} characters`);
    console.log(`   Has <div id="root">: ${html.includes('id="root"')}`);
    console.log(`   Has React scripts: ${html.includes('react')}`);
    console.log(`   Has Vite client: ${html.includes('vite/client')}`);
    
    // Check if root element has content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? {
        innerHTML: root.innerHTML.substring(0, 200),
        childCount: root.children.length
      } : null;
    });
    
    console.log(`\n5️⃣  Root element check:`);
    if (rootContent) {
      console.log(`   Children: ${rootContent.childCount}`);
      console.log(`   Content: ${rootContent.innerHTML || '(empty)'}`);
    } else {
      console.log(`   ❌ No #root element found!`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-blank-page.png', fullPage: true });
    console.log('\n📸 Screenshot saved: debug-blank-page.png');
    
    console.log('\n✅ Debug complete. Browser will stay open.');
    console.log('   Check console above for errors. Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await browser.close();
  }
}

debugBlankPage();
