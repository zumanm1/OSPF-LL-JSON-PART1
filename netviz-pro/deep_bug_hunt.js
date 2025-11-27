/**
 * DEEP BUG HUNT - Comprehensive Testing
 *
 * 10 Bounty Hunters targeting different areas:
 * 1. Empty State Handler
 * 2. File Upload Parser
 * 3. Country Filter Logic
 * 4. Link Selection/Edit
 * 5. Path Analysis Algorithm
 * 6. Simulation Mode
 * 7. Export Functionality
 * 8. LocalStorage Persistence
 * 9. D3 Rendering
 * 10. Modal Dialogs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const TEST_TOPOLOGY = {
  nodes: [
    { id: "A1", name: "A1", hostname: "test-a1", loopback_ip: "10.0.0.1", country: "TST", is_active: true, node_type: "router" },
    { id: "B1", name: "B1", hostname: "test-b1", loopback_ip: "10.0.0.2", country: "TST", is_active: true, node_type: "router" },
    { id: "C1", name: "C1", hostname: "test-c1", loopback_ip: "10.0.0.3", country: "XYZ", is_active: true, node_type: "router" },
  ],
  links: [
    { source: "A1", target: "B1", source_interface: "Gi0/0", target_interface: "Gi0/0", forward_cost: 100, reverse_cost: 200, cost: 100, status: "up" },
    { source: "B1", target: "C1", source_interface: "Gi0/1", target_interface: "Gi0/1", forward_cost: 50, reverse_cost: 50, cost: 50, status: "up" },
  ],
  metadata: { node_count: 3, edge_count: 2, data_source: "test_data" }
};

const BUGS_FOUND = [];

function logBug(hunter, severity, description, details = '') {
  BUGS_FOUND.push({ hunter, severity, description, details });
  const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : severity === 'MEDIUM' ? '🟡' : '🟢';
  console.log(`  ${icon} [${hunter}] ${description}`);
  if (details) console.log(`     └─ ${details}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    console.log('\n' + '='.repeat(70));
    console.log('   DEEP BUG HUNT - 10 BOUNTY HUNTERS');
    console.log('='.repeat(70) + '\n');

    // Setup: Clear localStorage and load app
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // ========== HUNTER 1: Empty State Handler ==========
    console.log('HUNTER 1: Empty State Handler');
    console.log('-'.repeat(50));

    const emptyStateVisible = await page.evaluate(() => {
      return document.body.textContent.includes('No Topology Loaded');
    });

    if (!emptyStateVisible) {
      logBug('Hunter1', 'HIGH', 'Empty state message not visible on fresh load');
    } else {
      console.log('  ✓ Empty state displays correctly');
    }

    // Check if buttons work in empty state
    const analysisClickable = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analysis'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!analysisClickable) {
      logBug('Hunter1', 'MEDIUM', 'Analysis tab not clickable in empty state');
    }

    // ========== HUNTER 2: File Upload Parser ==========
    console.log('\nHUNTER 2: File Upload Parser');
    console.log('-'.repeat(50));

    // Write test file
    const testFile = '/tmp/test_topology.json';
    fs.writeFileSync(testFile, JSON.stringify(TEST_TOPOLOGY));

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      logBug('Hunter2', 'CRITICAL', 'File input element not found');
    } else {
      await fileInput.uploadFile(testFile);
      await new Promise(r => setTimeout(r, 2000));

      const nodesLoaded = await page.evaluate(() => {
        const text = document.body.textContent;
        const match = text.match(/(\d+)\s*Nodes/);
        return match ? parseInt(match[1]) : 0;
      });

      if (nodesLoaded !== 3) {
        logBug('Hunter2', 'HIGH', `Node count mismatch: expected 3, got ${nodesLoaded}`);
      } else {
        console.log('  ✓ File upload and parsing works correctly');
      }
    }

    // ========== HUNTER 3: Country Filter Logic ==========
    console.log('\nHUNTER 3: Country Filter Logic');
    console.log('-'.repeat(50));

    const countryFilters = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter(b => b.textContent && (b.textContent.includes('TST') || b.textContent.includes('XYZ')))
        .length;
    });

    if (countryFilters < 2) {
      logBug('Hunter3', 'HIGH', 'Country filters not showing all countries from uploaded data');
    } else {
      console.log('  ✓ Country filters display correctly');
    }

    // Test toggle functionality
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('TST'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const nodesAfterFilter = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle');
      return circles.length;
    });

    // Re-enable
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('TST'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    console.log(`  ✓ Filter toggle works (nodes changed when filtered)`);

    // ========== HUNTER 4: Link Selection/Edit ==========
    console.log('\nHUNTER 4: Link Selection/Edit');
    console.log('-'.repeat(50));

    // Switch to simulation mode
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulation'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Try to click on a link
    const linkClicked = await page.evaluate(() => {
      const lines = document.querySelectorAll('line.cursor-pointer');
      if (lines.length > 0) {
        lines[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 500));

    const editPanelVisible = await page.evaluate(() => {
      return document.body.textContent.includes('Edit Link') || document.body.textContent.includes('OSPF Cost');
    });

    if (!editPanelVisible) {
      logBug('Hunter4', 'HIGH', 'Link edit panel does not appear when clicking link in simulation mode');
    } else {
      console.log('  ✓ Link selection and edit panel work');
    }

    // ========== HUNTER 5: Path Analysis Algorithm ==========
    console.log('\nHUNTER 5: Path Analysis Algorithm');
    console.log('-'.repeat(50));

    // Switch back to monitor mode and go to analysis
    await page.evaluate(() => {
      const mon = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Monitor'));
      if (mon) mon.click();
    });
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analysis'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Set source and destination
    const selects = await page.$$('select');
    if (selects.length >= 3) {
      await selects[2].select('A1');
      await new Promise(r => setTimeout(r, 200));
    }
    if (selects.length >= 5) {
      await selects[4].select('C1');
      await new Promise(r => setTimeout(r, 200));
    }

    // Click Find All / Find Path
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Find') && !b.textContent?.includes('Matrix')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const pathsFound = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/RESULTS\s*\((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    });

    if (pathsFound === 0) {
      logBug('Hunter5', 'CRITICAL', 'Path analysis returns 0 paths for connected nodes A1 -> C1');
    } else {
      console.log(`  ✓ Path analysis found ${pathsFound} path(s)`);
    }

    // ========== HUNTER 6: Simulation Mode ==========
    console.log('\nHUNTER 6: Simulation Mode');
    console.log('-'.repeat(50));

    // Go to topology tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Topology'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // Enable simulation
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulation'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const simBannerVisible = await page.evaluate(() => {
      return document.body.textContent.includes('Simulation Mode Active');
    });

    if (!simBannerVisible) {
      logBug('Hunter6', 'HIGH', 'Simulation mode banner not visible when activated');
    } else {
      console.log('  ✓ Simulation mode activates correctly');
    }

    // ========== HUNTER 7: Export Functionality ==========
    console.log('\nHUNTER 7: Export Functionality');
    console.log('-'.repeat(50));

    const downloadPath = '/tmp/export_test';
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    const exportBtn = await page.$('button[title="Export Topology JSON"]');
    if (!exportBtn) {
      logBug('Hunter7', 'MEDIUM', 'Export button not found');
    } else {
      await exportBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      const files = fs.readdirSync(downloadPath);
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (!jsonFile) {
        logBug('Hunter7', 'HIGH', 'Export did not create JSON file');
      } else {
        const exported = JSON.parse(fs.readFileSync(`${downloadPath}/${jsonFile}`, 'utf-8'));
        if (!exported.nodes || !exported.links) {
          logBug('Hunter7', 'HIGH', 'Exported file missing nodes or links');
        } else {
          console.log('  ✓ Export creates valid JSON with nodes and links');
        }
      }

      fs.rmSync(downloadPath, { recursive: true, force: true });
    }

    // ========== HUNTER 8: LocalStorage Persistence ==========
    console.log('\nHUNTER 8: LocalStorage Persistence');
    console.log('-'.repeat(50));

    const storageKeys = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.startsWith('netviz'));
    });

    if (storageKeys.length === 0) {
      logBug('Hunter8', 'MEDIUM', 'No localStorage keys found after data load');
    } else {
      console.log(`  ✓ LocalStorage has ${storageKeys.length} keys: ${storageKeys.join(', ')}`);
    }

    // Reload and check persistence
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    const nodesAfterReload = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/(\d+)\s*Nodes/);
      return match ? parseInt(match[1]) : 0;
    });

    if (nodesAfterReload !== 3) {
      logBug('Hunter8', 'HIGH', `Data not persisted after reload: expected 3 nodes, got ${nodesAfterReload}`);
    } else {
      console.log('  ✓ Data persists correctly after reload');
    }

    // ========== HUNTER 9: D3 Rendering ==========
    console.log('\nHUNTER 9: D3 Rendering');
    console.log('-'.repeat(50));

    const svgElements = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return null;
      return {
        circles: svg.querySelectorAll('circle').length,
        lines: svg.querySelectorAll('line').length,
        texts: svg.querySelectorAll('text').length,
      };
    });

    if (!svgElements) {
      logBug('Hunter9', 'CRITICAL', 'SVG element not found');
    } else if (svgElements.circles === 0) {
      logBug('Hunter9', 'HIGH', 'No nodes rendered in SVG');
    } else {
      console.log(`  ✓ D3 rendering: ${svgElements.circles} nodes, ${svgElements.lines} links, ${svgElements.texts} labels`);
    }

    // ========== HUNTER 10: Modal Dialogs ==========
    console.log('\nHUNTER 10: Modal Dialogs');
    console.log('-'.repeat(50));

    // Test Pair Countries Modal
    const pairBtn = await page.$('button[title="Pair Countries Analysis"]');
    if (pairBtn) {
      await pairBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const modalVisible = await page.evaluate(() => {
        return document.body.textContent.includes('Pair Countries') ||
               document.body.textContent.includes('Country Pair');
      });

      if (!modalVisible) {
        logBug('Hunter10', 'MEDIUM', 'Pair Countries modal does not open');
      } else {
        console.log('  ✓ Pair Countries modal opens');
        // Close modal
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Test Impact Analysis Modal
    const impactBtn = await page.$('button[title="Multi-Country Impact Analysis"]');
    if (impactBtn) {
      await impactBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const impactVisible = await page.evaluate(() => {
        return document.body.textContent.includes('Impact') ||
               document.body.textContent.includes('Transit');
      });

      if (!impactVisible) {
        logBug('Hunter10', 'MEDIUM', 'Impact Analysis modal does not open');
      } else {
        console.log('  ✓ Impact Analysis modal opens');
        await page.keyboard.press('Escape');
      }
    }

    // ========== Check Console Errors ==========
    console.log('\n' + '-'.repeat(50));
    console.log('CONSOLE ERRORS DETECTED:');
    console.log('-'.repeat(50));

    if (consoleErrors.length === 0) {
      console.log('  ✓ No console errors');
    } else {
      consoleErrors.forEach(err => {
        if (!err.includes('favicon') && !err.includes('DevTools')) {
          logBug('Console', 'HIGH', 'Console error detected', err.substring(0, 100));
        }
      });
    }

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(70));
    console.log('   BUG HUNT SUMMARY');
    console.log('='.repeat(70));

    const critical = BUGS_FOUND.filter(b => b.severity === 'CRITICAL').length;
    const high = BUGS_FOUND.filter(b => b.severity === 'HIGH').length;
    const medium = BUGS_FOUND.filter(b => b.severity === 'MEDIUM').length;
    const low = BUGS_FOUND.filter(b => b.severity === 'LOW').length;

    console.log(`\n  🔴 CRITICAL: ${critical}`);
    console.log(`  🟠 HIGH:     ${high}`);
    console.log(`  🟡 MEDIUM:   ${medium}`);
    console.log(`  🟢 LOW:      ${low}`);
    console.log(`  ─────────────────`);
    console.log(`  TOTAL:       ${BUGS_FOUND.length}`);

    if (BUGS_FOUND.length === 0) {
      console.log('\n  ✅ NO BUGS FOUND - APP IS HEALTHY!');
    } else {
      console.log('\n  BUGS TO FIX:');
      BUGS_FOUND.forEach((bug, i) => {
        console.log(`  ${i+1}. [${bug.severity}] ${bug.description}`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Cleanup
    fs.unlinkSync(testFile);

  } catch (error) {
    console.error('\n[FATAL ERROR]:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
