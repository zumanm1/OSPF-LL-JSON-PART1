/**
 * DEBUG POST-LOGIN STATE
 * Investigate what's happening after successful login
 */

import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[CONSOLE ERROR]:', msg.text());
    }
  });

  try {
    console.log('\n=== DEBUG POST-LOGIN STATE ===\n');

    // Go to app
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/debug_01_initial.png' });
    console.log('1. Initial state screenshot saved');

    // Check what we see
    const initialContent = await page.evaluate(() => {
      return {
        bodyText: document.body.textContent?.substring(0, 500),
        hasLogin: document.body.textContent?.includes('Login'),
        hasPassword: !!document.querySelector('input[type="password"]'),
        hasUsername: !!document.querySelector('input[type="text"]'),
      };
    });
    console.log('Initial state:', JSON.stringify(initialContent, null, 2));

    if (initialContent.hasLogin) {
      // Login
      console.log('\n2. Attempting login...');
      await page.type('input[type="text"]', 'admin');
      await page.type('input[type="password"]', 'Admin@2025!Secure');

      await page.screenshot({ path: '/tmp/debug_02_before_click.png' });

      // Click login
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.textContent?.toLowerCase().includes('login') ||
          b.textContent?.toLowerCase().includes('sign in')
        );
        if (btn) {
          console.log('Found login button:', btn.textContent);
          btn.click();
        } else {
          console.log('No login button found');
        }
      });

      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: '/tmp/debug_03_after_login.png' });
      console.log('3. After login screenshot saved');

      // Check post-login state
      const postLoginState = await page.evaluate(() => {
        const body = document.body;
        return {
          bodyTextSnippet: body.textContent?.substring(0, 1000),
          hasNetVizPro: body.textContent?.includes('NetViz Pro'),
          hasPasswordChange: body.textContent?.includes('Password Change') || body.textContent?.includes('Change Password'),
          hasExpired: body.textContent?.includes('Expired'),
          hasGraceLogins: body.textContent?.includes('grace') || body.textContent?.includes('remaining'),
          hasMonitor: body.textContent?.includes('Monitor'),
          hasSimulation: body.textContent?.includes('Simulation'),
          hasUpload: body.textContent?.includes('Upload'),
          hasTopology: body.textContent?.includes('Topology'),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 20),
        };
      });

      console.log('\n4. Post-login state:');
      console.log(JSON.stringify(postLoginState, null, 2));

      // If password change is required
      if (postLoginState.hasPasswordChange) {
        console.log('\n5. Password change detected - handling...');

        // Look for change password button/modal
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent?.includes('Change') || b.textContent?.includes('Now')
          );
          if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: '/tmp/debug_04_password_change.png' });
      }

      // Wait more and check again
      await new Promise(r => setTimeout(r, 2000));

      const finalState = await page.evaluate(() => {
        return {
          bodyTextSnippet: document.body.textContent?.substring(0, 500),
          visibleText: document.body.innerText?.substring(0, 500),
        };
      });

      console.log('\n6. Final state:');
      console.log(finalState.visibleText);

      await page.screenshot({ path: '/tmp/debug_05_final.png' });
      console.log('\n7. Final screenshot saved to /tmp/debug_05_final.png');
    }

    console.log('\n=== Debug complete. Check /tmp/debug_*.png for screenshots ===\n');

    // Keep browser open for manual inspection
    console.log('Browser kept open. Press Ctrl+C to close.');
    await new Promise(() => {}); // Keep alive

  } catch (error) {
    console.error('\n[ERROR]:', error.message);
    await page.screenshot({ path: '/tmp/debug_error.png' });
  }
})();
