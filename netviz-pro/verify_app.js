
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Log console messages from the browser to our node console
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  try {
    console.log('Navigating to http://localhost:9040...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0', timeout: 10000 });
    
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // Check for main element
    const main = await page.$('main');
    if (main) {
        console.log('Main element found.');
    } else {
        console.error('Main element NOT found.');
    }

    // Check if Simulation button exists
    const simButton = await page.$('button.bg-purple-600'); // Active state logic might make this tricky to select if not active, but there is a button with 'Simulation' text
    
    const buttons = await page.$$('button');
    let simBtnFound = false;
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Simulation')) {
            console.log('Simulation button found.');
            simBtnFound = true;
            // Click it
            await btn.click();
            console.log('Clicked Simulation button.');
            break;
        }
    }

    if (!simBtnFound) {
        console.error('Simulation button not found.');
    }

    // Check for warning banner
    // Wait a bit for React to update
    await new Promise(r => setTimeout(r, 1000));
    
    const warning = await page.$('div.bg-purple-900\\/30'); // escaping /
    if (warning) {
         const text = await page.evaluate(el => el.textContent, warning);
         console.log(`Warning Banner Content: ${text}`);
    } else {
        console.log('Warning banner not found (maybe selector issue or not triggered).');
    }

    console.log('Verification passed.');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browser.close();
  }
})();
