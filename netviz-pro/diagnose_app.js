/**
 * DIAGNOSE APP STATE
 * Debug what's happening after login
 */

import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[Browser]:', msg.text()));

  try {
    console.log('\n=== DIAGNOSE APP STATE ===\n');

    // Go to app
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Login
    const usernameField = await page.$('input[type="text"]');
    const passwordField = await page.$('input[type="password"]');

    if (usernameField && passwordField) {
      console.log('1. Found login form, entering credentials...');
      await usernameField.type('netviz_admin');
      await passwordField.type('Kx9$mP2vQ7nL@2025');

      // Click Sign In
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.textContent?.toLowerCase().includes('sign')
        );
        if (btn) btn.click();
      });

      console.log('2. Clicked sign in, waiting...');
      await new Promise(r => setTimeout(r, 4000));

      // Get full page state
      const pageState = await page.evaluate(() => {
        const body = document.body;
        return {
          // Full visible text (first 3000 chars)
          fullText: body.innerText?.substring(0, 3000),

          // Key elements
          hasNetVizPro: body.textContent.includes('NetViz Pro'),
          hasMonitor: body.textContent.includes('Monitor'),
          hasSimulation: body.textContent.includes('Simulation'),
          hasPasswordChange: body.textContent.includes('Change Password') ||
                             body.textContent.includes('Password Change') ||
                             body.textContent.includes('Password Required'),
          hasGraceWarning: body.textContent.includes('remaining') ||
                          body.textContent.includes('grace'),
          hasExpired: body.textContent.includes('Expired'),
          hasError: body.textContent.includes('Invalid') ||
                    body.textContent.includes('Error'),

          // DOM structure
          buttonTexts: Array.from(document.querySelectorAll('button'))
            .map(b => b.textContent?.trim())
            .filter(Boolean)
            .slice(0, 20),
          inputCount: document.querySelectorAll('input').length,
          hasFileInput: !!document.querySelector('input[type="file"]'),
          hasSVG: !!document.querySelector('svg'),

          // Check for specific components
          headerText: document.querySelector('header')?.textContent?.substring(0, 200),
        };
      });

      console.log('\n3. PAGE STATE AFTER LOGIN:');
      console.log('=====================================');
      console.log('NetViz Pro visible:', pageState.hasNetVizPro);
      console.log('Monitor button:', pageState.hasMonitor);
      console.log('Simulation button:', pageState.hasSimulation);
      console.log('Password change screen:', pageState.hasPasswordChange);
      console.log('Grace warning:', pageState.hasGraceWarning);
      console.log('Expired screen:', pageState.hasExpired);
      console.log('Error visible:', pageState.hasError);
      console.log('File input exists:', pageState.hasFileInput);
      console.log('SVG exists:', pageState.hasSVG);
      console.log('Input count:', pageState.inputCount);
      console.log('\nButtons found:', pageState.buttonTexts.join(', '));
      console.log('\nHeader text:', pageState.headerText);

      console.log('\n\n=== FULL VISIBLE TEXT ===');
      console.log(pageState.fullText);
      console.log('=====================================\n');

    } else {
      console.log('No login form found!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
