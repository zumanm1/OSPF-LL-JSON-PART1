/**
 * DIAGNOSTIC SCRIPT FOR PORT 9040
 * Deep investigation of what's happening
 */

import puppeteer from 'puppeteer';

async function diagnose9040() {
  console.log('🔍 DIAGNOSING PORT 9040\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    devtools: true, // Open DevTools automatically
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture ALL console messages
  page.on('console', msg => {
    const type = msg.type().toUpperCase();
    console.log(`[BROWSER ${type}] ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Capture request failures
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()}`);
    console.log(`   Failure: ${request.failure()?.errorText || 'Unknown'}`);
  });

  // Capture all responses
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400) {
      console.log(`[HTTP ${status}] ${url}`);
    }
  });

  try {
    console.log('1️⃣  Attempting to load http://localhost:9040...\n');
    
    await page.goto('http://localhost:9040', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('\n2️⃣  Page loaded! Checking content...\n');
    
    // Get page title
    const title = await page.title();
    console.log(`   Title: ${title}`);
    
    // Get HTML length
    const html = await page.content();
    console.log(`   HTML length: ${html.length} characters`);
    
    // Check for root element
    const hasRoot = await page.$('#root');
    console.log(`   Has #root element: ${hasRoot ? 'YES' : 'NO'}`);
    
    // Get body text
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`   Body text length: ${bodyText.length} characters`);
    console.log(`   Body preview: ${bodyText.substring(0, 200)}`);
    
    // Take screenshot
    await page.screenshot({ path: 'diagnose-9040-loaded.png', fullPage: true });
    console.log('\n📸 Screenshot saved: diagnose-9040-loaded.png');
    
    // Wait to see what happens
    console.log('\n3️⃣  Waiting 10 seconds to observe behavior...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check again after wait
    const bodyTextAfter = await page.evaluate(() => document.body.innerText);
    console.log(`   Body text after wait: ${bodyTextAfter.length} characters`);
    
    if (bodyTextAfter.length > bodyText.length) {
      console.log('   ✅ Content increased - app is loading dynamically');
    } else if (bodyTextAfter.length === bodyText.length) {
      console.log('   ⚠️  Content unchanged - app might be stuck');
    }
    
    await page.screenshot({ path: 'diagnose-9040-after-wait.png', fullPage: true });
    console.log('📸 Screenshot saved: diagnose-9040-after-wait.png');
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DIAGNOSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nBrowser will stay open. Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'diagnose-9040-error.png' });
    console.log('📸 Error screenshot saved');
    await browser.close();
    process.exit(1);
  }
}

diagnose9040();
