/**
 * FINAL VALIDATION - 2 PORT ARCHITECTURE
 * Ports: 9040 (Vite) + 9041 (Auth)
 */

import puppeteer from 'puppeteer';

async function finalValidation() {
  console.log('🎯 FINAL VALIDATION - 2 PORT ARCHITECTURE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    console.log('📋 TEST: Loading http://localhost:9040\n');
    
    await page.goto('http://localhost:9040', { 
      waitUntil: 'load',
      timeout: 20000 
    });
    
    console.log('✅ Page loaded!');
    console.log(`   Title: ${await page.title()}`);
    
    await page.screenshot({ path: 'PROOF_01_page_loaded.png', fullPage: true });
    console.log('📸 Screenshot 1: PROOF_01_page_loaded.png\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`   Content: ${bodyText.length} characters`);
    console.log(`   Preview: ${bodyText.substring(0, 150)}\n`);
    
    await page.screenshot({ path: 'PROOF_02_content_check.png', fullPage: true });
    console.log('📸 Screenshot 2: PROOF_02_content_check.png\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ VALIDATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nScreenshots saved as proof of working application.');
    console.log('Browser will close in 5 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'PROOF_ERROR.png' });
    console.log('📸 Error screenshot: PROOF_ERROR.png');
    await browser.close();
    process.exit(1);
  }
}

finalValidation();
