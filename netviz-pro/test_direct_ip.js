/**
 * Test accessing via 127.0.0.1 instead of localhost
 */

import puppeteer from 'puppeteer';

async function testDirectIP() {
  console.log('Testing 127.0.0.1:9040 vs localhost:9040\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    console.log('1️⃣  Trying http://127.0.0.1:9040...');
    await page.goto('http://127.0.0.1:9040', { 
      waitUntil: 'load',
      timeout: 10000 
    });
    
    console.log('✅ SUCCESS with 127.0.0.1!');
    console.log(`   Title: ${await page.title()}`);
    
    await page.screenshot({ path: 'PROOF_127_0_0_1.png', fullPage: true });
    console.log('📸 Screenshot: PROOF_127_0_0_1.png\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await page.screenshot({ path: 'ERROR_127_0_0_1.png' });
    await browser.close();
    process.exit(1);
  }
}

testDirectIP();
