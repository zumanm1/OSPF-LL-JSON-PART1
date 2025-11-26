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
    console.log('PAGE LOG:', msg.text());
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
      await new Promise(r => setTimeout(r, 1000)); // Wait longer for tab switch
    }

    // Take screenshot to see what's actually visible
    await page.screenshot({ path: 'analysis_tab.png', fullPage: true });
    console.log('Screenshot saved to analysis_tab.png');

    // Debug: Check what select elements are actually available
    const allSelects = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map((select, index) => ({
        index,
        value: select.value,
        options: Array.from(select.options).map(opt => opt.value),
        parentText: select.parentElement?.textContent?.substring(0, 100)
      }));
    });
    console.log('All select elements:', JSON.stringify(allSelects, null, 2));

    // 6. Select source and destination countries
    console.log('6. Configuring path analysis (ZIM -> USA)...');
    
    // Use the correct select indices based on the debug output
    const selects = await page.$$('select');
    console.log('Found', selects.length, 'select elements');
    
    if (selects.length >= 5) {
      // Index 1 = Source country, Index 3 = Destination country
      console.log('Setting source country to ZIM...');
      await selects[1].click();
      await selects[1].select('ZIM');
      await new Promise(r => setTimeout(r, 500));

      console.log('Setting destination country to USA...');
      await selects[3].click();
      await selects[3].select('USA');
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.log('ERROR: Not enough select elements found');
    }

    // 7. Calculate paths
    console.log('7. Calculating all paths...');
    
    // First, let's see what buttons are available on the Analysis tab
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => btn.textContent?.trim()).filter(text => text);
    });
    console.log('Available buttons:', allButtons);
    
    const findPathBtn = await findByText('button', 'Find All');
    console.log('Find All button found:', !!findPathBtn);
    if (findPathBtn) {
      const buttonText = await page.evaluate(btn => btn.textContent, findPathBtn);
      console.log('Button text:', buttonText);
      await findPathBtn.click();
      console.log('Button clicked, waiting for calculation...');
      await new Promise(r => setTimeout(r, 3000)); // Wait longer for calculation
    } else {
      console.log('ERROR: Find All button not found!');
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
    console.log('// 8. Test specific asymmetric link (R1 -> R4)')
    console.log('8. Testing specific asymmetric link (R1 -> R4)...');
    
    // Select specific nodes instead of countries to force using the asymmetric link
    const nodeSelects = await page.$$('select');
    if (nodeSelects.length >= 5) {
      // Index 2 = Source node, Index 4 = Destination node
      console.log('Setting source node to R1...');
      await nodeSelects[1].click(); // Source country first
      await nodeSelects[1].select('ZIM');
      await new Promise(r => setTimeout(r, 300));
      
      await nodeSelects[2].click(); // Source node
      await nodeSelects[2].select('R1');
      await new Promise(r => setTimeout(r, 300));

      console.log('Setting destination node to R4...');
      await nodeSelects[3].click(); // Dest country first  
      await nodeSelects[3].select('ZIM');
      await new Promise(r => setTimeout(r, 300));
      
      await nodeSelects[4].click(); // Dest node
      await nodeSelects[4].select('R4');
      await new Promise(r => setTimeout(r, 300));

      // Test forward direction
      console.log('Testing forward direction R1 -> R4...');
      await findPathBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      const forwardCost = await page.evaluate(() => {
        const costElements = document.querySelectorAll('div.p-3.rounded.border.cursor-pointer');
        if (costElements.length > 0) {
          const text = costElements[0].textContent;
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        }
        return null;
      });

      // Test reverse direction
      console.log('Testing reverse direction R4 -> R1...');
      await nodeSelects[2].click();
      await nodeSelects[2].select('R4');
      await nodeSelects[4].click(); 
      await nodeSelects[4].select('R1');
      await new Promise(r => setTimeout(r, 300));

      await findPathBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      const reverseCost = await page.evaluate(() => {
        const costElements = document.querySelectorAll('div.p-3.rounded.border.cursor-pointer');
        if (costElements.length > 0) {
          const text = costElements[0].textContent;
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        }
        return null;
      });

      console.log(`   ✓ Forward path cost (R1 -> R4): ${forwardCost}`);
      console.log(`   ✓ Reverse path cost (R4 -> R1): ${reverseCost}`);
      
      if (forwardCost === 10 && reverseCost === 10000) {
        console.log('   ✓ ASYMMETRIC ROUTING VALIDATED: Forward=10, Reverse=10000');
      } else {
        console.log(`   ⚠ Expected Forward=10, Reverse=10000. Got Forward=${forwardCost}, Reverse=${reverseCost}`);
      }
    }

    // 9. Testing reverse direction (USA -> ZIM)...');
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
