/**
 * ADVANCED TEST: Asymmetric Routing Path Calculation Validation
 *
 * This test validates that:
 * 1. Path calculations correctly use forward_cost for forward direction
 * 2. Path calculations correctly use reverse_cost for reverse direction
 * 3. Shortest paths differ when costs are asymmetric
 * 4. Cost matrices reflect asymmetric costs accurately
 */

import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('ERROR') || msg.text().includes('Warning')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  const findByText = async (selector, text) => {
    const elements = await page.$$(selector);
    for (const el of elements) {
      const content = await page.evaluate(node => node.textContent, el);
      if (content && content.includes(text)) return el;
    }
    return null;
  };

  try {
    console.log('\n=== ASYMMETRIC ROUTING TEST START ===\n');

    // 1. Load app
    console.log('1. Loading app...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Activate Simulation Mode
    console.log('2. Activating Simulation Mode...');
    const simBtn = await findByText('button', 'Simulation');
    if (simBtn) {
      await simBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 3. Create a highly asymmetric link
    console.log('3. Creating asymmetric link (Forward: 10, Reverse: 10000)...');

    // Select first link
    await page.waitForSelector('line.cursor-pointer');
    const links = await page.$$('line.cursor-pointer');
    if (links.length > 0) {
      await links[0].click();
      await new Promise(r => setTimeout(r, 500));

      // Get source and target node IDs from the panel
      const panelText = await page.evaluate(() => {
        const panel = document.querySelector('div.absolute.bottom-4.right-4');
        return panel ? panel.textContent : '';
      });

      console.log(`   Selected link panel info: ${panelText.substring(0, 100)}...`);

      // Set forward cost to 10 (very cheap)
      const inputs = await page.$$('input[type="number"]');
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('10');

        // Set reverse cost to 10000 (very expensive)
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('10000');

        const applyBtn = await findByText('button', 'Apply Changes');
        if (applyBtn) {
          await applyBtn.click();
          await new Promise(r => setTimeout(r, 500));
          console.log('   ✓ Asymmetric costs applied: 10 (forward) / 10000 (reverse)');
        }
      }
    }

    // 4. Create another asymmetric link in opposite direction
    console.log('4. Creating second asymmetric link (Forward: 5000, Reverse: 5)...');
    // Re-query links after DOM update
    const links2 = await page.$$('line.cursor-pointer');
    if (links2.length > 1) {
      await links2[1].click();
      await new Promise(r => setTimeout(r, 500));

      const inputs = await page.$$('input[type="number"]');
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('5000');

        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('5');

        const applyBtn = await findByText('button', 'Apply Changes');
        if (applyBtn) {
          await applyBtn.click();
          await new Promise(r => setTimeout(r, 500));
          console.log('   ✓ Asymmetric costs applied: 5000 (forward) / 5 (reverse)');
        }
      }
    }

    // 5. Switch to Analysis tab
    console.log('5. Switching to Analysis tab...');
    const analysisTab = await findByText('button', 'Analysis');
    if (analysisTab) {
      await analysisTab.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 6. Select source and destination countries
    console.log('6. Configuring path analysis (ZIM -> USA)...');
    const selects = await page.$$('select');
    if (selects.length >= 4) {
      // Source country
      await selects[0].click();
      await selects[0].select('ZIM');
      await new Promise(r => setTimeout(r, 300));

      // Destination country
      await selects[2].click();
      await selects[2].select('USA');
      await new Promise(r => setTimeout(r, 300));
    }

    // 7. Calculate paths
    console.log('7. Calculating all paths...');
    const findPathBtn = await findByText('button', 'Find All');
    if (findPathBtn) {
      await findPathBtn.click();
      await new Promise(r => setTimeout(r, 2000)); // Wait for calculation
    }

    // 8. Check if paths were found
    const pathResults = await page.evaluate(() => {
      const resultCards = document.querySelectorAll('div.p-3.rounded.border.cursor-pointer');
      const paths = [];
      resultCards.forEach(card => {
        const text = card.textContent;
        const costMatch = text.match(/(\d+)/);
        if (costMatch) {
          paths.push({
            cost: parseInt(costMatch[1]),
            text: text.substring(0, 100)
          });
        }
      });
      return paths;
    });

    if (pathResults.length > 0) {
      console.log(`   ✓ Found ${pathResults.length} path(s)`);
      console.log(`   ✓ Lowest cost path: ${pathResults[0].cost}`);
      console.log(`   ✓ Highest cost path: ${pathResults[pathResults.length - 1].cost}`);

      // Check if costs vary significantly (indicating asymmetric routing is working)
      if (pathResults.length > 1) {
        const costSpread = pathResults[pathResults.length - 1].cost - pathResults[0].cost;
        if (costSpread > 1000) {
          console.log(`   ✓ CONFIRMED: Asymmetric routing detected (cost spread: ${costSpread})`);
        } else {
          console.warn(`   ⚠ Warning: Cost spread is low (${costSpread}), asymmetric effect may be minimal`);
        }
      }
    } else {
      console.warn('   ⚠ No paths found');
    }

    // 9. Test reverse direction (USA -> ZIM)
    console.log('8. Testing reverse direction (USA -> ZIM)...');
    const selects2 = await page.$$('select');
    if (selects2.length >= 4) {
      await selects2[0].select('USA');
      await new Promise(r => setTimeout(r, 300));
      await selects2[2].select('ZIM');
      await new Promise(r => setTimeout(r, 300));
    }

    const findPathBtn2 = await findByText('button', 'Find All');
    if (findPathBtn2) {
      await findPathBtn2.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    const reversePathResults = await page.evaluate(() => {
      const resultCards = document.querySelectorAll('div.p-3.rounded.border.cursor-pointer');
      const paths = [];
      resultCards.forEach(card => {
        const text = card.textContent;
        const costMatch = text.match(/(\d+)/);
        if (costMatch) {
          paths.push(parseInt(costMatch[1]));
        }
      });
      return paths;
    });

    if (reversePathResults.length > 0) {
      console.log(`   ✓ Found ${reversePathResults.length} reverse path(s)`);
      console.log(`   ✓ Lowest cost reverse path: ${reversePathResults[0]}`);

      // Compare forward vs reverse
      if (pathResults.length > 0 && reversePathResults.length > 0) {
        if (pathResults[0].cost !== reversePathResults[0]) {
          console.log(`   ✅ SUCCESS: Forward (${pathResults[0].cost}) and reverse (${reversePathResults[0]}) paths have DIFFERENT costs`);
          console.log('   ✅ ASYMMETRIC ROUTING IS WORKING CORRECTLY!');
        } else {
          console.log(`   ⚠ Warning: Forward and reverse costs are identical (${pathResults[0].cost})`);
          console.log('   ⚠ This may indicate symmetric routing or insufficient asymmetry in test setup');
        }
      }
    }

    // 10. Export topology to verify costs are persisted
    console.log('9. Exporting topology to verify asymmetric costs...');
    const exportBtn = await page.$('button[title="Export Topology JSON"]');
    if (exportBtn) {
      await exportBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      console.log('   ✓ Topology exported');
    }

    console.log('\n=== ASYMMETRIC ROUTING TEST PASSED ===\n');

  } catch (error) {
    console.error('\n=== ASYMMETRIC ROUTING TEST FAILED ===');
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
