/**
 * FINAL COMPREHENSIVE BUG HUNT
 */
import puppeteer from 'puppeteer';
import fs from 'fs';

const BUGS = [];
function logBug(area, severity, desc) {
  BUGS.push({ area, severity, desc });
  console.log(`  ❌ [${area}] ${desc}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('\n=== FINAL COMPREHENSIVE BUG HUNT ===\n');

  try {
    // 1. Load app with real topology
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    const input = await page.$('input[type="file"]');
    await input.uploadFile('/Users/macbook/OSPF-LL-JSON/network_topology_2025-11-25 (1).json');
    await new Promise(r => setTimeout(r, 2000));

    console.log('1. DATA LOADING');
    const stats = await page.evaluate(() => ({
      nodes: document.body.textContent.match(/(\d+)\s*Nodes/)?.[1] || '0',
      links: document.body.textContent.match(/(\d+)\s*Links/)?.[1] || '0'
    }));
    console.log(`   ✓ Loaded ${stats.nodes} nodes, ${stats.links} links`);

    // 2. Country filters
    console.log('\n2. COUNTRY FILTERS');
    const countries = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.filter(b => /^(ZIM|USA|DEU|GBR)/.test(b.textContent?.trim() || '')).map(b => b.textContent.trim().substring(0, 3));
    });
    if (countries.length >= 4) {
      console.log(`   ✓ All countries visible: ${countries.join(', ')}`);
    } else {
      logBug('Countries', 'HIGH', `Missing country filters: ${countries.join(', ')}`);
    }

    // 3. Node selection
    console.log('\n3. NODE SELECTION');
    await page.evaluate(() => {
      const circle = document.querySelector('circle');
      if (circle) circle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));
    const detailsPanel = await page.evaluate(() =>
      document.body.textContent.includes('Router Details') || document.body.textContent.includes('Loopback')
    );
    if (detailsPanel) {
      console.log('   ✓ Node details panel appears');
    } else {
      logBug('NodeSelect', 'MEDIUM', 'Node details panel not showing');
    }

    // 4. Simulation mode
    console.log('\n4. SIMULATION MODE');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulation'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const simActive = await page.evaluate(() => document.body.textContent.includes('Simulation Mode Active'));
    if (simActive) {
      console.log('   ✓ Simulation mode activates');
    } else {
      logBug('Simulation', 'HIGH', 'Simulation mode banner not shown');
    }

    // 5. Link edit in simulation
    console.log('\n5. LINK EDITING');
    await page.evaluate(() => {
      const line = document.querySelector('line.cursor-pointer');
      if (line) line.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));
    const editPanel = await page.evaluate(() =>
      document.body.textContent.includes('Edit Link') || document.body.textContent.includes('OSPF Cost')
    );
    if (editPanel) {
      console.log('   ✓ Link edit panel appears');
    } else {
      logBug('LinkEdit', 'HIGH', 'Link edit panel not appearing in simulation mode');
    }

    // 6. Path analysis
    console.log('\n6. PATH ANALYSIS');
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

    // Set source/dest and find paths
    const selects = await page.$$('select');
    if (selects.length >= 2) await selects[1].select('ZIM');
    await new Promise(r => setTimeout(r, 200));
    if (selects.length >= 4) await selects[3].select('DEU');
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Find'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const paths = await page.evaluate(() => {
      const match = document.body.textContent.match(/RESULTS\s*\((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    });
    if (paths > 0) {
      console.log(`   ✓ Path analysis found ${paths} paths`);
    } else {
      logBug('PathAnalysis', 'CRITICAL', 'No paths found between ZIM and DEU');
    }

    // 7. Export
    console.log('\n7. EXPORT FUNCTIONALITY');
    const downloadPath = '/tmp/export_check';
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Topology'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const exportBtn = await page.$('button[title="Export Topology JSON"]');
    if (exportBtn) {
      await exportBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      const files = fs.readdirSync(downloadPath);
      if (files.some(f => f.endsWith('.json'))) {
        console.log('   ✓ Export creates JSON file');
      } else {
        logBug('Export', 'HIGH', 'Export does not create file');
      }
      fs.rmSync(downloadPath, { recursive: true, force: true });
    }

    // 8. Modals
    console.log('\n8. MODAL DIALOGS');
    const pairBtn = await page.$('button[title="Pair Countries Analysis"]');
    if (pairBtn) {
      await pairBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const pairModal = await page.evaluate(() => document.body.textContent.includes('Country Pair'));
      if (pairModal) {
        console.log('   ✓ Pair Countries modal works');
        await page.keyboard.press('Escape');
      } else {
        logBug('Modal', 'MEDIUM', 'Pair Countries modal not opening');
      }
    }

    await new Promise(r => setTimeout(r, 300));

    const impactBtn = await page.$('button[title="Multi-Country Impact Analysis"]');
    if (impactBtn) {
      await impactBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const impactModal = await page.evaluate(() =>
        document.body.textContent.includes('Impact') || document.body.textContent.includes('Transit')
      );
      if (impactModal) {
        console.log('   ✓ Impact Analysis modal works');
      } else {
        logBug('Modal', 'MEDIUM', 'Impact Analysis modal not opening');
      }
    }

    // 9. Persistence test
    console.log('\n9. PERSISTENCE');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    const afterReload = await page.evaluate(() => {
      const match = document.body.textContent.match(/(\d+)\s*Nodes/);
      return match ? parseInt(match[1]) : 0;
    });
    if (afterReload === 10) {
      console.log('   ✓ Data persists after reload');
    } else {
      logBug('Persistence', 'HIGH', `Data not persisted: expected 10 nodes, got ${afterReload}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));

    if (BUGS.length === 0) {
      console.log('\n✅ NO BUGS FOUND - APP IS HEALTHY!\n');
    } else {
      console.log(`\n❌ BUGS FOUND: ${BUGS.length}`);
      BUGS.forEach(b => console.log(`   - [${b.severity}] ${b.area}: ${b.desc}`));
      console.log('');
    }

    const realErrors = errors.filter(e => !e.includes('favicon') && !e.includes('DevTools'));
    if (realErrors.length > 0) {
      console.log('Console Errors:', realErrors.length);
      realErrors.forEach(e => console.log('   - ' + e.substring(0, 80)));
    }

  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
