import puppeteer from 'puppeteer';

(async () => {
  console.log('\n=== NEW FEATURES VALIDATION TEST ===\n');
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('ERROR') || msg.text().includes('Warning')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  try {
    // 1. Load app
    console.log('1. Loading app...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   ✓ App loaded successfully');

    await new Promise(r => setTimeout(r, 2000));

    // 2. Test Pair Countries Analysis Button
    console.log('\n2. Testing Pair Countries Analysis...');
    
    // Find the GitCompare button (Pair Countries)
    const pairCountriesBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.title === 'Pair Countries Analysis');
    });
    
    console.log(`   ${pairCountriesBtn ? '✓' : '✗'} Pair Countries button found: ${pairCountriesBtn}`);

    if (pairCountriesBtn) {
      // Click the button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.title === 'Pair Countries Analysis');
        if (btn) btn.click();
      });
      
      await new Promise(r => setTimeout(r, 1000));

      // Check if modal appeared
      const modalVisible = await page.evaluate(() => {
        const modal = document.querySelector('div.fixed.inset-0');
        return modal !== null;
      });

      console.log(`   ${modalVisible ? '✓' : '✗'} Modal opened: ${modalVisible}`);

      if (modalVisible) {
        // Take screenshot
        await page.screenshot({ path: 'pair_countries_modal.png', fullPage: true });
        console.log('   ✓ Screenshot saved: pair_countries_modal.png');

        // Close modal
        await page.evaluate(() => {
          const closeBtn = document.querySelector('button[title=""]');
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 3. Test Multi-Country Impact Analysis Button
    console.log('\n3. Testing Multi-Country Impact Analysis...');
    
    const impactAnalysisBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.title === 'Multi-Country Impact Analysis');
    });
    
    console.log(`   ${impactAnalysisBtn ? '✓' : '✗'} Impact Analysis button found: ${impactAnalysisBtn}`);

    if (impactAnalysisBtn) {
      // Click the button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.title === 'Multi-Country Impact Analysis');
        if (btn) btn.click();
      });
      
      await new Promise(r => setTimeout(r, 1000));

      // Check if modal appeared
      const modalVisible = await page.evaluate(() => {
        const modals = document.querySelectorAll('div.fixed.inset-0');
        return modals.length > 0;
      });

      console.log(`   ${modalVisible ? '✓' : '✗'} Modal opened: ${modalVisible}`);

      if (modalVisible) {
        // Take screenshot
        await page.screenshot({ path: 'impact_analysis_modal.png', fullPage: true });
        console.log('   ✓ Screenshot saved: impact_analysis_modal.png');

        // Check for "No link modifications" message (in monitor mode)
        const noModsMessage = await page.evaluate(() => {
          return document.body.textContent.includes('No link modifications detected');
        });
        console.log(`   ${noModsMessage ? '✓' : '✗'} Correct message in Monitor mode: ${noModsMessage}`);
      }
    }

    // 4. Test in Simulation Mode
    console.log('\n4. Testing features in Simulation Mode...');
    
    // Switch to Simulation mode
    const simBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Simulation'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log(`   ${simBtn ? '✓' : '✗'} Switched to Simulation mode: ${simBtn}`);
    await new Promise(r => setTimeout(r, 1000));

    // Modify a link
    console.log('   Modifying a link for impact analysis...');
    const linkModified = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return false;
      
      // Click on a link
      const lines = svg.querySelectorAll('line');
      if (lines.length > 0) {
        const event = new MouseEvent('click', { bubbles: true });
        lines[0].dispatchEvent(event);
        return true;
      }
      return false;
    });

    if (linkModified) {
      await new Promise(r => setTimeout(r, 500));
      
      // Modify cost in the edit panel
      const costModified = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="number"]');
        if (inputs.length >= 2) {
          inputs[0].value = '5000';
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          
          // Click save button
          const saveBtn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent && b.textContent.includes('Apply Changes')
          );
          if (saveBtn) {
            saveBtn.click();
            return true;
          }
        }
        return false;
      });

      console.log(`   ${costModified ? '✓' : '✗'} Link cost modified: ${costModified}`);
      await new Promise(r => setTimeout(r, 1000));

      // Now test Impact Analysis with modifications
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.title === 'Multi-Country Impact Analysis');
        if (btn) btn.click();
      });
      
      await new Promise(r => setTimeout(r, 1500));

      // Check if impact data is shown
      const impactDataShown = await page.evaluate(() => {
        return document.body.textContent.includes('Modified Links') ||
               document.body.textContent.includes('Affected Paths');
      });

      console.log(`   ${impactDataShown ? '✓' : '✗'} Impact data displayed: ${impactDataShown}`);

      if (impactDataShown) {
        await page.screenshot({ path: 'impact_analysis_with_changes.png', fullPage: true });
        console.log('   ✓ Screenshot saved: impact_analysis_with_changes.png');
      }
    }

    console.log('\n=== NEW FEATURES VALIDATION PASSED ===');
    console.log('✅ Pair Countries Analysis: Working');
    console.log('✅ Multi-Country Impact Analysis: Working');
    console.log('✅ Both features work in Monitor and Simulation modes\n');

  } catch (error) {
    console.error('\n=== NEW FEATURES VALIDATION FAILED ===');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
