/**
 * Quick Puppeteer validation - takes screenshots of login and main app
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:9040';
const ADMIN_USER = 'netviz_admin';
const ADMIN_PASS = 'V3ry$trongAdm1n!2025';

async function run() {
  console.log('🚀 Starting Puppeteer validation...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Navigate to gateway
    console.log('1️⃣ Navigating to gateway...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Check if we see login page
    const pageTitle = await page.title();
    console.log(`   Page title: ${pageTitle}`);
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/validation_01_login.png',
      fullPage: true 
    });
    console.log('   📸 Screenshot: validation_01_login.png');
    
    // Check for login form
    const hasLoginForm = await page.$('input[name="username"]');
    if (hasLoginForm) {
      console.log('   ✅ Login form detected');
      
      // Step 2: Fill in credentials
      console.log('\n2️⃣ Filling login credentials...');
      await page.type('input[name="username"]', ADMIN_USER);
      await page.type('input[name="password"]', ADMIN_PASS);
      
      await page.screenshot({ 
        path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/validation_02_credentials.png',
        fullPage: true 
      });
      console.log('   📸 Screenshot: validation_02_credentials.png');
      
      // Step 3: Submit login
      console.log('\n3️⃣ Submitting login...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        page.click('button[type="submit"]')
      ]);
      
      // Check cookies
      const cookies = await page.cookies();
      const sessionCookie = cookies.find(c => c.name === 'netviz_session');
      if (sessionCookie) {
        console.log('   ✅ Session cookie set');
      } else {
        console.log('   ⚠️ No session cookie found');
      }
      
      // Take screenshot after login
      await page.screenshot({ 
        path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/validation_03_after_login.png',
        fullPage: true 
      });
      console.log('   📸 Screenshot: validation_03_after_login.png');
      
      // Check page content
      const content = await page.content();
      if (content.includes('NetViz Pro') && !content.includes('Sign In')) {
        console.log('   ✅ Successfully logged in - main app visible');
      } else if (content.includes('Sign In')) {
        console.log('   ⚠️ Still on login page (may be rate limited)');
      }
      
      // Wait a moment for React to render
      await new Promise(r => setTimeout(r, 2000));
      
      // Final screenshot
      await page.screenshot({ 
        path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/validation_04_main_app.png',
        fullPage: true 
      });
      console.log('   📸 Screenshot: validation_04_main_app.png');
      
    } else {
      console.log('   ⚠️ Login form not found - may already be authenticated or rate limited');
      await page.screenshot({ 
        path: '/Users/macbook/OSPF-LL-JSON-PART1/netviz-pro/validation_current_state.png',
        fullPage: true 
      });
    }
    
    console.log('\n✅ Puppeteer validation complete!');
    console.log('\nScreenshots saved in netviz-pro directory.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
