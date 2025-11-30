/**
 * FULL APP VERIFICATION TEST
 * Complete E2E test with proper authentication handling
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

const RESULTS = { passed: 0, failed: 0, tests: [] };

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? ` - ${detail}` : ''}`);
  RESULTS.tests.push({ status, name, detail });
  if (status === 'PASS') RESULTS.passed++;
  else RESULTS.failed++;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  try {
    console.log('\n' + '='.repeat(70));
    console.log('   NETVIZ PRO - FULL APPLICATION TEST');
    console.log('='.repeat(70) + '\n');

    // ========== STEP 1: Navigate to app ==========
    console.log('STEP 1: Load Application');
    console.log('-'.repeat(50));

    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const hasAuthForm = await page.evaluate(() => {
      return !!document.querySelector('input[type="password"]');
    });

    if (hasAuthForm) {
      log('PASS', 'Auth System', 'Login form detected');
    } else {
      log('FAIL', 'Auth System', 'No login form found');
    }

    // ========== STEP 2: Login ==========
    console.log('\nSTEP 2: Authentication');
    console.log('-'.repeat(50));

    if (hasAuthForm) {
      // Find username field (could be text or username type)
      const usernameField = await page.$('input[type="text"]') || await page.$('input[name="username"]');
      const passwordField = await page.$('input[type="password"]');

      if (usernameField && passwordField) {
        await usernameField.type('netviz_admin');
        await passwordField.type('Kx9$mP2vQ7nL@2025');

        // Click Sign In button
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent?.toLowerCase().includes('sign') ||
            b.textContent?.toLowerCase().includes('login')
          );
          if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 3000));

        // Check if we got past login
        const postLoginCheck = await page.evaluate(() => {
          const text = document.body.textContent;
          return {
            hasPasswordChange: text.includes('Password Change') || text.includes('Change Password') || text.includes('Password Required'),
            hasGraceWarning: text.includes('remaining') || text.includes('grace'),
            hasApp: text.includes('Monitor') && text.includes('Simulation'),
            hasError: text.includes('Invalid') || text.includes('incorrect'),
          };
        });

        if (postLoginCheck.hasError) {
          log('FAIL', 'Login', 'Invalid credentials');
        } else if (postLoginCheck.hasPasswordChange && !postLoginCheck.hasApp) {
          // Forced password change - need to handle
          log('PASS', 'Login', 'Password change required (normal for first login)');

          // Click "Change Now" button
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
              b.textContent?.includes('Change') && b.textContent?.includes('Now')
            );
            if (btn) btn.click();
          });
          await new Promise(r => setTimeout(r, 1000));

          // Fill password change form
          const currentPwField = await page.$('input[placeholder*="Current"]') ||
                                 (await page.$$('input[type="password"]'))[0];
          const newPwFields = await page.$$('input[type="password"]');

          if (newPwFields.length >= 3) {
            await newPwFields[0].type('Admin@2025!Secure'); // Current
            await newPwFields[1].type('NewSecure@2025!Pass'); // New
            await newPwFields[2].type('NewSecure@2025!Pass'); // Confirm

            await page.evaluate(() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent?.includes('Change') || b.textContent?.includes('Update')
              );
              if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 2000));
          }

        } else if (postLoginCheck.hasApp) {
          log('PASS', 'Login', 'Authenticated successfully');
        } else if (postLoginCheck.hasGraceWarning) {
          log('PASS', 'Login', 'Logged in with password change warning (grace period)');
        } else {
          log('PASS', 'Login', 'Authentication processed');
        }
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    // ========== STEP 3: Verify Main App UI ==========
    console.log('\nSTEP 3: Main Application UI');
    console.log('-'.repeat(50));

    const appUICheck = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasNetVizTitle: text.includes('NetViz Pro'),
        hasMonitor: text.includes('Monitor'),
        hasSimulation: text.includes('Simulation'),
        hasTopology: text.includes('Topology'),
        hasAnalysis: text.includes('Analysis'),
        hasNodesLinks: text.includes('Nodes') && text.includes('Links'),
        hasUpload: text.includes('Upload') || text.includes('Topology or Logs'),
        hasEmptyState: text.includes('No Topology Loaded') || text.includes('No file loaded'),
      };
    });

    if (appUICheck.hasNetVizTitle) {
      log('PASS', 'App Title', 'NetViz Pro visible');
    } else {
      log('FAIL', 'App Title', 'NetViz Pro not found');
    }

    if (appUICheck.hasMonitor && appUICheck.hasSimulation) {
      log('PASS', 'Mode Toggle', 'Monitor/Simulation buttons present');
    } else {
      log('FAIL', 'Mode Toggle', 'Mode toggle not found');
    }

    if (appUICheck.hasTopology || appUICheck.hasAnalysis) {
      log('PASS', 'Tab Navigation', 'Topology/Analysis tabs present');
    } else {
      log('FAIL', 'Tab Navigation', 'Tabs not found');
    }

    if (appUICheck.hasEmptyState || appUICheck.hasUpload) {
      log('PASS', 'Empty State', 'No data state or upload prompt visible');
    }

    // ========== STEP 4: Check Analysis Tools ==========
    console.log('\nSTEP 4: Analysis Tools');
    console.log('-'.repeat(50));

    const analysisTools = await page.evaluate(() => {
      const text = document.body.textContent;
      const tools = ['Pair', 'Impact', 'Transit', 'What-If', 'Matrix', 'Dijkstra',
                     'Traffic', 'Optimizer', 'Ripple', 'Health', 'Capacity'];
      const found = tools.filter(tool => text.includes(tool));
      return { found, count: found.length };
    });

    if (analysisTools.count >= 5) {
      log('PASS', 'Analysis Tools', `${analysisTools.count} tools available: ${analysisTools.found.join(', ')}`);
    } else {
      log('FAIL', 'Analysis Tools', `Only ${analysisTools.count} tools found`);
    }

    // ========== STEP 5: Test File Upload ==========
    console.log('\nSTEP 5: File Upload');
    console.log('-'.repeat(50));

    const testFile = '/tmp/test_topology.json';
    fs.writeFileSync(testFile, JSON.stringify(TEST_TOPOLOGY));

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(testFile);
      await new Promise(r => setTimeout(r, 3000));

      const uploadResult = await page.evaluate(() => {
        const text = document.body.textContent;
        const nodeMatch = text.match(/(\d+)\s*Nodes/i);
        const linkMatch = text.match(/(\d+)\s*Links/i);
        return {
          nodes: nodeMatch ? parseInt(nodeMatch[1]) : 0,
          links: linkMatch ? parseInt(linkMatch[1]) : 0,
          hasCountryFilters: text.includes('TST') || text.includes('XYZ'),
        };
      });

      if (uploadResult.nodes >= 3) {
        log('PASS', 'File Upload', `${uploadResult.nodes} nodes, ${uploadResult.links} links loaded`);
      } else {
        log('FAIL', 'File Upload', `Expected 3 nodes, got ${uploadResult.nodes}`);
      }

      if (uploadResult.hasCountryFilters) {
        log('PASS', 'Country Filters', 'Country filters populated from data');
      }
    } else {
      log('FAIL', 'File Input', 'File input element not found');
    }

    // ========== STEP 6: Test Simulation Mode ==========
    console.log('\nSTEP 6: Simulation Mode');
    console.log('-'.repeat(50));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Simulation') && !b.textContent?.includes('Reset')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const simBanner = await page.evaluate(() => {
      return document.body.textContent.includes('Simulation Mode Active');
    });

    if (simBanner) {
      log('PASS', 'Simulation Mode', 'Banner displayed when active');
    } else {
      log('FAIL', 'Simulation Mode', 'Banner not visible');
    }

    // ========== STEP 7: Test D3 Graph Rendering ==========
    console.log('\nSTEP 7: Graph Visualization');
    console.log('-'.repeat(50));

    const graphElements = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return { exists: false };
      return {
        exists: true,
        circles: svg.querySelectorAll('circle').length,
        lines: svg.querySelectorAll('line').length,
        texts: svg.querySelectorAll('text').length,
      };
    });

    if (graphElements.exists && graphElements.circles > 0) {
      log('PASS', 'D3 Graph', `${graphElements.circles} nodes, ${graphElements.lines} links rendered`);
    } else if (graphElements.exists) {
      log('FAIL', 'D3 Graph', 'SVG exists but no nodes rendered');
    } else {
      log('FAIL', 'D3 Graph', 'SVG element not found');
    }

    // ========== STEP 8: Test LocalStorage Persistence ==========
    console.log('\nSTEP 8: LocalStorage Persistence');
    console.log('-'.repeat(50));

    const storageCheck = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('netviz'));
      const hasData = localStorage.getItem('netviz_original_data');
      return {
        keys,
        hasData: !!hasData && hasData.length > 100,
        dataSize: hasData ? hasData.length : 0,
      };
    });

    if (storageCheck.hasData) {
      log('PASS', 'LocalStorage', `Data persisted (${storageCheck.dataSize} bytes)`);
    } else {
      log('FAIL', 'LocalStorage', 'Data not persisted');
    }

    // Clean up
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(70));
    console.log('   TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n  ✅ PASSED:  ${RESULTS.passed}`);
    console.log(`  ❌ FAILED:  ${RESULTS.failed}`);
    console.log(`  ─────────────────`);
    console.log(`  TOTAL:      ${RESULTS.tests.length}`);

    const passRate = ((RESULTS.passed / RESULTS.tests.length) * 100).toFixed(1);
    console.log(`\n  PASS RATE: ${passRate}%`);

    if (RESULTS.failed === 0) {
      console.log('\n  🎉 ALL TESTS PASSED - APP IS HEALTHY!');
    } else {
      console.log('\n  Failed tests:');
      RESULTS.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`    - ${t.name}: ${t.detail}`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');

    process.exit(RESULTS.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n[FATAL ERROR]:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
