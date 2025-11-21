import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const findByText = async (selector, text) => {
    const elements = await page.$$(selector);
    for (const el of elements) {
      const content = await page.evaluate(node => node.textContent, el);
      if (content && content.includes(text)) return el;
    }
    return null;
  };

  const getLocalStorageItem = async (key) => {
    return await page.evaluate((k) => {
      return localStorage.getItem(k);
    }, key);
  };

  try {
    console.log('\n=== PERSISTENCE TEST START ===\n');
    
    // 1. Navigate to app
    console.log('1. Loading app...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Verify initial localStorage state (should have sample data)
    console.log('2. Checking initial localStorage...');
    const initialData = await getLocalStorageItem('netviz_original_data');
    if (initialData) {
      const parsed = JSON.parse(initialData);
      console.log(`   ✓ Original data persisted: ${parsed.nodes.length} nodes, ${parsed.links.length} links`);
    } else {
      throw new Error('Initial data not found in localStorage');
    }

    // 3. Toggle Simulation Mode
    console.log('3. Activating Simulation Mode...');
    const simBtn = await findByText('button', 'Simulation');
    if (simBtn) {
      await simBtn.click();
      await new Promise(r => setTimeout(r, 500));
      
      // Verify simulation mode persisted
      const simMode = await getLocalStorageItem('netviz_simulation_mode');
      if (simMode === 'true') {
        console.log('   ✓ Simulation mode persisted');
      } else {
        throw new Error('Simulation mode not persisted');
      }
    }

    // 4. Select and modify a link
    console.log('4. Modifying link cost...');
    await page.waitForSelector('line.cursor-pointer');
    const links = await page.$$('line.cursor-pointer');
    if (links.length > 0) {
      await links[0].click();
      await new Promise(r => setTimeout(r, 500));
      
      const inputs = await page.$$('input[type="number"]');
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('555');
        
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('777');
        
        const applyBtn = await findByText('button', 'Apply Changes');
        if (applyBtn) {
          await applyBtn.click();
          await new Promise(r => setTimeout(r, 500));
          
          // Verify overrides persisted
          const overrides = await getLocalStorageItem('netviz_link_overrides');
          if (overrides) {
            const parsed = JSON.parse(overrides);
            const keys = Object.keys(parsed);
            if (keys.length > 0) {
              console.log(`   ✓ Link overrides persisted: ${keys.length} modified link(s)`);
              console.log(`   ✓ Override values: cost=${parsed[keys[0]].cost}, reverse_cost=${parsed[keys[0]].reverse_cost}`);
            } else {
              throw new Error('Link overrides empty');
            }
          } else {
            throw new Error('Link overrides not persisted');
          }
        }
      }
    }

    // 5. Modify country filter
    console.log('5. Modifying country filter...');
    const countryButtons = await page.$$('button');
    let filterModified = false;
    for (const btn of countryButtons) {
      const classes = await page.evaluate(el => el.className, btn);
      if (classes && classes.includes('bg-gray-800') && classes.includes('border-gray-700')) {
        // This is likely a country filter button
        await btn.click();
        await new Promise(r => setTimeout(r, 300));
        filterModified = true;
        break;
      }
    }
    
    if (filterModified) {
      const activeCountries = await getLocalStorageItem('netviz_active_countries');
      if (activeCountries) {
        const parsed = JSON.parse(activeCountries);
        console.log(`   ✓ Active countries persisted: ${parsed.length} countries visible`);
      }
    }

    // 6. CRITICAL TEST: Reload page and verify state persists
    console.log('6. Reloading page to test persistence...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // 7. Verify simulation mode is still active
    console.log('7. Verifying persisted state after reload...');
    const warningBanner = await page.$('div.bg-purple-900\\/30');
    if (warningBanner) {
      console.log('   ✓ Simulation mode restored after reload');
    } else {
      throw new Error('Simulation mode NOT restored after reload');
    }

    // 8. Verify pending changes still exist
    const pendingChanges = await findByText('h3', 'Pending Changes');
    if (pendingChanges) {
      console.log('   ✓ Pending changes restored after reload');
    } else {
      console.warn('   ⚠ Pending changes not visible (may be in different tab)');
    }

    // 9. Test Clear Cache button
    console.log('8. Testing Clear Cache functionality...');
    
    // Setup dialog handler BEFORE clicking
    page.on('dialog', async dialog => {
      console.log(`   Dialog: ${dialog.message()}`);
      await dialog.accept(); // Accept the confirmation
    });
    
    const clearBtn = await page.$('button[title="Clear Cached Data"]');
    if (clearBtn) {
      await clearBtn.click();
      // Wait for reload (triggered by handleClearCache)
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1000));
      
      // Verify localStorage cleared
      const clearedOverrides = await getLocalStorageItem('netviz_link_overrides');
      const clearedSimMode = await getLocalStorageItem('netviz_simulation_mode');
      
      if (!clearedOverrides || clearedOverrides === '{}') {
        console.log('   ✓ Cache cleared successfully');
      } else {
        console.warn('   ⚠ Cache may not be fully cleared');
      }
      
      // Verify app reset to default (no simulation banner)
      const noBanner = await page.$('div.bg-purple-900\\/30');
      if (!noBanner) {
        console.log('   ✓ App reset to default state');
      }
    } else {
      throw new Error('Clear Cache button not found');
    }

    console.log('\n=== PERSISTENCE TEST PASSED ===\n');

  } catch (error) {
    console.error('\n=== PERSISTENCE TEST FAILED ===');
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
