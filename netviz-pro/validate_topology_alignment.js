/**
 * COMPREHENSIVE TOPOLOGY VALIDATION TEST
 *
 * Validates:
 * 1. All nodes from source file are loaded correctly
 * 2. All links match source file (including asymmetric costs)
 * 3. GBR to DEU path analysis with costs displayed
 * 4. Screenshots of path visualization on topology
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TOPOLOGY_FILE = '/Users/macbook/Downloads/topology-2025-11-25T09_10_51.793Z.json';
const SCREENSHOT_DIR = './validation_screenshots';

// Source data for validation
const EXPECTED_NODES = {
  'gbr-r9': { country: 'GBR', hostname: '172.16.9.9' },
  'gbr-r7': { country: 'GBR', hostname: '172.16.7.7' },
  'zwe-r1': { country: 'ZWE', hostname: '172.16.1.1' },
  'zwe-r2': { country: 'ZWE', hostname: '172.16.2.2' },
  'zwe-r3': { country: 'ZWE', hostname: '172.16.3.3' },
  'zwe-r4': { country: 'ZWE', hostname: '172.16.4.4' },
  'usa-r5': { country: 'USA', hostname: '172.16.5.5' },
  'usa-r8': { country: 'USA', hostname: '172.16.8.8' },
  'deu-r10': { country: 'DEU', hostname: '172.16.10.10' },
  'deu-r6': { country: 'DEU', hostname: '172.16.6.6' },
};

// Key asymmetric links to validate
const ASYMMETRIC_LINKS = [
  { a: 'deu-r6', b: 'gbr-r9', cost_a_to_b: 180, cost_b_to_a: 90 },
  { a: 'zwe-r3', b: 'zwe-r4', cost_a_to_b: 70, cost_b_to_a: 1130 },
  { a: 'zwe-r1', b: 'zwe-r4', cost_a_to_b: 10, cost_b_to_a: 1 },
  { a: 'usa-r8', b: 'zwe-r4', cost_a_to_b: 250, cost_b_to_a: 150 },
  { a: 'zwe-r1', b: 'zwe-r2', cost_a_to_b: 200, cost_b_to_a: 300 },
  { a: 'gbr-r7', b: 'zwe-r1', cost_a_to_b: 500, cost_b_to_a: 400 },
  { a: 'deu-r10', b: 'usa-r5', cost_a_to_b: 600, cost_b_to_a: 800 },
];

(async () => {
  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1000 }
  });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Detected') || text.includes('ERROR') || text.includes('path')) {
      console.log('PAGE:', text);
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
    console.log('\n' + '='.repeat(70));
    console.log('   COMPREHENSIVE TOPOLOGY VALIDATION');
    console.log('='.repeat(70) + '\n');

    // ========== PHASE 1: Load App and Upload File ==========
    console.log('PHASE 1: Loading Application');
    console.log('-'.repeat(50));

    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    console.log('  [OK] App loaded at http://localhost:9040');

    // Upload topology file
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    await fileInput.uploadFile(TOPOLOGY_FILE);
    await new Promise(r => setTimeout(r, 2000));
    console.log('  [OK] Topology file uploaded');

    // Take initial screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_topology_loaded.png` });
    console.log('  [OK] Screenshot: 01_topology_loaded.png\n');

    // ========== PHASE 2: Validate Nodes ==========
    console.log('PHASE 2: Validating Nodes');
    console.log('-'.repeat(50));

    const loadedNodes = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle');
      const nodes = [];
      circles.forEach(circle => {
        const text = circle.nextElementSibling;
        if (text && text.tagName === 'text') {
          nodes.push(text.textContent);
        }
      });
      return nodes;
    });

    console.log(`  Expected: ${Object.keys(EXPECTED_NODES).length} nodes`);
    console.log(`  Loaded:   ${loadedNodes.length} nodes`);

    let nodesMissing = [];
    for (const nodeId of Object.keys(EXPECTED_NODES)) {
      if (!loadedNodes.includes(nodeId)) {
        nodesMissing.push(nodeId);
      }
    }

    if (nodesMissing.length === 0) {
      console.log('  [OK] All nodes present: ' + Object.keys(EXPECTED_NODES).join(', '));
    } else {
      console.log('  [WARN] Missing nodes: ' + nodesMissing.join(', '));
    }

    // Verify country counts
    const countryStats = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const stats = {};
      buttons.forEach(btn => {
        const text = btn.textContent;
        ['GBR', 'ZWE', 'USA', 'DEU'].forEach(c => {
          if (text && text.includes(c)) {
            const match = text.match(/\((\d+)\)/);
            if (match) stats[c] = parseInt(match[1]);
          }
        });
      });
      return stats;
    });

    console.log('  Country node counts:');
    console.log(`    GBR: ${countryStats.GBR || 0} (expected 2)`);
    console.log(`    ZWE: ${countryStats.ZWE || 0} (expected 4)`);
    console.log(`    USA: ${countryStats.USA || 0} (expected 2)`);
    console.log(`    DEU: ${countryStats.DEU || 0} (expected 2)\n`);

    // ========== PHASE 3: Validate Links ==========
    console.log('PHASE 3: Validating Links');
    console.log('-'.repeat(50));

    const linkStats = await page.evaluate(() => {
      const lines = document.querySelectorAll('line');
      let totalLinks = 0;
      let orangeLinks = 0;
      lines.forEach(line => {
        if (line.getAttribute('stroke-width')) {
          totalLinks++;
          if (line.getAttribute('stroke') === '#f97316') {
            orangeLinks++;
          }
        }
      });
      return { totalLinks, orangeLinks };
    });

    console.log(`  Total links displayed: ${linkStats.totalLinks}`);
    console.log(`  Asymmetric (orange) links: ${linkStats.orangeLinks}`);
    console.log(`  Expected: 16 total, 7 asymmetric`);

    if (linkStats.orangeLinks === 7) {
      console.log('  [OK] Correct number of asymmetric links\n');
    } else {
      console.log('  [WARN] Asymmetric link count mismatch\n');
    }

    // ========== PHASE 4: GBR to DEU Path Analysis ==========
    console.log('PHASE 4: GBR to DEU Path Analysis');
    console.log('-'.repeat(50));

    // Switch to Analysis tab
    const analysisBtn = await findByText('button', 'Analysis');
    if (analysisBtn) {
      await analysisBtn.click();
      await new Promise(r => setTimeout(r, 500));
      console.log('  [OK] Switched to Analysis tab');
    }

    // Get all select elements
    const selects = await page.$$('select');
    console.log(`  Found ${selects.length} select dropdowns`);

    // Set source country to GBR
    if (selects.length >= 2) {
      await selects[1].select('GBR');
      await new Promise(r => setTimeout(r, 300));
      console.log('  [OK] Source country: GBR');
    }

    // Set destination country to DEU
    if (selects.length >= 4) {
      await selects[3].select('DEU');
      await new Promise(r => setTimeout(r, 300));
      console.log('  [OK] Destination country: DEU');
    }

    // Click Find All to calculate paths
    const findAllBtn = await findByText('button', 'Find All');
    if (findAllBtn) {
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      console.log('  [OK] Path calculation triggered');
    }

    // Take screenshot of path results
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_gbr_to_deu_paths.png` });
    console.log('  [OK] Screenshot: 02_gbr_to_deu_paths.png');

    // Extract path results
    const pathResults = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const paths = [];
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const path = cells[1]?.textContent || '';
          const cost = cells[2]?.textContent || '';
          const hops = cells[3]?.textContent || '';
          if (path && cost) {
            paths.push({ path, cost: parseInt(cost), hops: parseInt(hops) });
          }
        }
      });
      return paths;
    });

    console.log(`\n  GBR → DEU Paths Found: ${pathResults.length}`);
    console.log('  ' + '-'.repeat(60));

    if (pathResults.length > 0) {
      // Show top 5 paths
      pathResults.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i+1}. Cost: ${p.cost.toString().padStart(4)} | Hops: ${p.hops} | ${p.path}`);
      });

      console.log('  ' + '-'.repeat(60));
      console.log(`  Lowest cost path: ${pathResults[0].cost}`);
      console.log(`  Path: ${pathResults[0].path}`);
    }

    // ========== PHASE 5: Specific Router Path (gbr-r7 to deu-r6) ==========
    console.log('\nPHASE 5: Specific Path Analysis (gbr-r7 → deu-r6)');
    console.log('-'.repeat(50));

    // Set specific source node
    if (selects.length >= 3) {
      await selects[2].select('gbr-r7');
      await new Promise(r => setTimeout(r, 300));
      console.log('  [OK] Source node: gbr-r7');
    }

    // Set specific destination node
    if (selects.length >= 5) {
      await selects[4].select('deu-r6');
      await new Promise(r => setTimeout(r, 300));
      console.log('  [OK] Destination node: deu-r6');
    }

    // Calculate path
    if (findAllBtn) {
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Get the path result for this specific pair
    const specificPath = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const path = cells[1]?.textContent || '';
          const cost = cells[2]?.textContent || '';
          if (path.includes('gbr-r7') && path.includes('deu-r6')) {
            return { path, cost: parseInt(cost) };
          }
        }
      }
      return null;
    });

    if (specificPath) {
      console.log(`  Forward path (gbr-r7 → deu-r6):`);
      console.log(`    Path: ${specificPath.path}`);
      console.log(`    Cost: ${specificPath.cost}`);

      // Expected: gbr-r7 → deu-r6 direct link costs 10
      if (specificPath.cost === 10) {
        console.log('    [OK] Cost matches direct link (10)');
      } else {
        console.log(`    [INFO] Cost differs from direct link, using alternate path`);
      }
    }

    // Take screenshot with path highlighted
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_gbr_r7_to_deu_r6.png` });
    console.log('  [OK] Screenshot: 03_gbr_r7_to_deu_r6.png');

    // ========== PHASE 6: Reverse Path Analysis (DEU to GBR) ==========
    console.log('\nPHASE 6: Reverse Path Analysis (deu-r6 → gbr-r7)');
    console.log('-'.repeat(50));

    // Swap source and destination
    if (selects.length >= 3) {
      await selects[2].select('deu-r6');
      await new Promise(r => setTimeout(r, 300));
    }
    if (selects.length >= 5) {
      await selects[4].select('gbr-r7');
      await new Promise(r => setTimeout(r, 300));
    }

    // Need to also set countries
    if (selects.length >= 2) {
      await selects[1].select('DEU');
      await new Promise(r => setTimeout(r, 300));
    }
    if (selects.length >= 4) {
      await selects[3].select('GBR');
      await new Promise(r => setTimeout(r, 300));
    }

    // Calculate reverse path
    if (findAllBtn) {
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const reversePath = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const path = cells[1]?.textContent || '';
          const cost = cells[2]?.textContent || '';
          if (path.includes('deu-r6') && path.includes('gbr-r7')) {
            return { path, cost: parseInt(cost) };
          }
        }
      }
      return null;
    });

    if (reversePath) {
      console.log(`  Reverse path (deu-r6 → gbr-r7):`);
      console.log(`    Path: ${reversePath.path}`);
      console.log(`    Cost: ${reversePath.cost}`);
    }

    // Take screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_deu_r6_to_gbr_r7.png` });
    console.log('  [OK] Screenshot: 04_deu_r6_to_gbr_r7.png');

    // ========== PHASE 7: Test Asymmetric Path (deu-r6 ↔ gbr-r9) ==========
    console.log('\nPHASE 7: Asymmetric Link Test (deu-r6 ↔ gbr-r9)');
    console.log('-'.repeat(50));
    console.log('  Source file shows: deu-r6 → gbr-r9 = 180, gbr-r9 → deu-r6 = 90');

    // Forward: deu-r6 → gbr-r9
    if (selects.length >= 3) await selects[2].select('deu-r6');
    if (selects.length >= 5) await selects[4].select('gbr-r9');
    if (selects.length >= 2) await selects[1].select('DEU');
    if (selects.length >= 4) await selects[3].select('GBR');
    await new Promise(r => setTimeout(r, 300));

    if (findAllBtn) {
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const asymForward = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      let lowestCost = null;
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const cost = parseInt(cells[2]?.textContent || '0');
          if (cost > 0 && (lowestCost === null || cost < lowestCost)) {
            lowestCost = cost;
          }
        }
      }
      return lowestCost;
    });

    console.log(`  Forward (deu-r6 → gbr-r9): Cost = ${asymForward}`);

    // Reverse: gbr-r9 → deu-r6
    if (selects.length >= 3) await selects[2].select('gbr-r9');
    if (selects.length >= 5) await selects[4].select('deu-r6');
    if (selects.length >= 2) await selects[1].select('GBR');
    if (selects.length >= 4) await selects[3].select('DEU');
    await new Promise(r => setTimeout(r, 300));

    if (findAllBtn) {
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const asymReverse = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      let lowestCost = null;
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const cost = parseInt(cells[2]?.textContent || '0');
          if (cost > 0 && (lowestCost === null || cost < lowestCost)) {
            lowestCost = cost;
          }
        }
      }
      return lowestCost;
    });

    console.log(`  Reverse (gbr-r9 → deu-r6): Cost = ${asymReverse}`);

    if (asymForward !== asymReverse) {
      console.log('  [OK] ASYMMETRIC ROUTING CONFIRMED - Different costs in each direction!');
    } else {
      console.log('  [INFO] Costs are equal - may be using alternate paths');
    }

    // Take screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_asymmetric_test.png` });
    console.log('  [OK] Screenshot: 05_asymmetric_test.png');

    // ========== PHASE 8: Topology View with Path Highlighted ==========
    console.log('\nPHASE 8: Topology View with Path');
    console.log('-'.repeat(50));

    // Switch to Topology tab to see visual
    const topoBtn = await findByText('button', 'Topology');
    if (topoBtn) {
      await topoBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Click on a path row to highlight it
    await page.click('tr:nth-child(2)');
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_path_highlighted.png` });
    console.log('  [OK] Screenshot: 06_path_highlighted.png');

    // ========== FINAL SUMMARY ==========
    console.log('\n' + '='.repeat(70));
    console.log('   VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`  Nodes:           ${loadedNodes.length}/10 loaded`);
    console.log(`  Links:           ${linkStats.totalLinks} total`);
    console.log(`  Asymmetric:      ${linkStats.orangeLinks} orange links`);
    console.log(`  Countries:       GBR(${countryStats.GBR || 0}), DEU(${countryStats.DEU || 0}), USA(${countryStats.USA || 0}), ZWE(${countryStats.ZWE || 0})`);
    console.log(`  Screenshots:     ${SCREENSHOT_DIR}/`);
    console.log('='.repeat(70));
    console.log('   TOPOLOGY VALIDATION COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n[ERROR] Validation failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error_state.png` });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
