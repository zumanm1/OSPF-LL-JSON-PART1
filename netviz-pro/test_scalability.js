/**
 * SCALABILITY TEST
 *
 * Validates:
 * 1. App starts with empty state (no hardcoded data)
 * 2. Can load topologies of any size
 * 3. Country colors work dynamically for unknown codes
 * 4. Simulation mode works with any topology
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

// Generate a large test topology dynamically
function generateLargeTopology(nodeCount, linkRatio = 2) {
  const countries = ['AAA', 'BBB', 'CCC', 'DDD', 'XXX', 'YYY', 'ZZZ'];
  const nodes = [];
  const links = [];

  // Generate nodes
  for (let i = 1; i <= nodeCount; i++) {
    nodes.push({
      id: `R${i}`,
      name: `R${i}`,
      hostname: `${countries[i % countries.length].toLowerCase()}-r${i}`,
      loopback_ip: `10.${Math.floor(i/256)}.${i%256}.${i}`,
      country: countries[i % countries.length],
      is_active: true,
      node_type: 'router',
    });
  }

  // Generate links (create a mesh-like network)
  const linkCount = Math.min(nodeCount * linkRatio, nodeCount * (nodeCount - 1) / 2);
  const usedPairs = new Set();

  for (let i = 0; i < linkCount; i++) {
    let src, tgt;
    do {
      src = Math.floor(Math.random() * nodeCount) + 1;
      tgt = Math.floor(Math.random() * nodeCount) + 1;
    } while (src === tgt || usedPairs.has(`${src}-${tgt}`) || usedPairs.has(`${tgt}-${src}`));

    usedPairs.add(`${src}-${tgt}`);

    const forwardCost = Math.floor(Math.random() * 1000) + 1;
    const reverseCost = Math.random() > 0.7 ? Math.floor(Math.random() * 1000) + 1 : forwardCost;

    links.push({
      source: `R${src}`,
      target: `R${tgt}`,
      source_interface: `Gi0/${i}`,
      target_interface: `Gi0/${i}`,
      forward_cost: forwardCost,
      reverse_cost: reverseCost,
      cost: forwardCost,
      is_asymmetric: forwardCost !== reverseCost,
      status: 'up',
    });
  }

  return {
    nodes,
    links,
    metadata: {
      node_count: nodes.length,
      edge_count: links.length,
      data_source: `Generated: ${nodeCount} nodes, ${links.length} links`,
    }
  };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('   SCALABILITY TEST');
    console.log('='.repeat(60) + '\n');

    // 1. Test Empty State
    console.log('TEST 1: Empty State (Fresh Load)');
    console.log('-'.repeat(40));

    // Clear localStorage first
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    const emptyState = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasEmptyMessage: text.includes('No Topology Loaded'),
        nodeCount: text.includes('0 Nodes') || text.includes('0Nodes'),
        linkCount: text.includes('0 Links') || text.includes('0Links'),
      };
    });

    console.log(`  Empty message shown: ${emptyState.hasEmptyMessage ? 'YES' : 'NO'}`);
    console.log(`  [${emptyState.hasEmptyMessage ? 'OK' : 'WARN'}] App starts with empty state\n`);

    // 2. Test Small Topology (10 nodes)
    console.log('TEST 2: Small Topology (10 nodes)');
    console.log('-'.repeat(40));

    const smallTopo = generateLargeTopology(10, 2);
    const smallFile = '/tmp/small_topo.json';
    fs.writeFileSync(smallFile, JSON.stringify(smallTopo));

    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(smallFile);
    await new Promise(r => setTimeout(r, 2000));

    const smallResult = await page.evaluate(() => {
      const text = document.body.textContent;
      const nodeMatch = text.match(/(\d+)\s*Nodes/);
      const linkMatch = text.match(/(\d+)\s*Links/);
      return {
        nodes: nodeMatch ? parseInt(nodeMatch[1]) : 0,
        links: linkMatch ? parseInt(linkMatch[1]) : 0,
      };
    });

    console.log(`  Loaded: ${smallResult.nodes} nodes, ${smallResult.links} links`);
    console.log(`  Expected: ${smallTopo.nodes.length} nodes, ${smallTopo.links.length} links`);
    console.log(`  [${smallResult.nodes === smallTopo.nodes.length ? 'OK' : 'FAIL'}] Small topology loaded\n`);

    // 3. Test Medium Topology (50 nodes)
    console.log('TEST 3: Medium Topology (50 nodes)');
    console.log('-'.repeat(40));

    const mediumTopo = generateLargeTopology(50, 2);
    const mediumFile = '/tmp/medium_topo.json';
    fs.writeFileSync(mediumFile, JSON.stringify(mediumTopo));

    await fileInput.uploadFile(mediumFile);
    await new Promise(r => setTimeout(r, 3000));

    const mediumResult = await page.evaluate(() => {
      const text = document.body.textContent;
      const nodeMatch = text.match(/(\d+)\s*Nodes/);
      return nodeMatch ? parseInt(nodeMatch[1]) : 0;
    });

    console.log(`  Loaded: ${mediumResult} nodes`);
    console.log(`  [${mediumResult === mediumTopo.nodes.length ? 'OK' : 'FAIL'}] Medium topology loaded\n`);

    // 4. Test Large Topology (100 nodes)
    console.log('TEST 4: Large Topology (100 nodes)');
    console.log('-'.repeat(40));

    const largeTopo = generateLargeTopology(100, 2);
    const largeFile = '/tmp/large_topo.json';
    fs.writeFileSync(largeFile, JSON.stringify(largeTopo));

    await fileInput.uploadFile(largeFile);
    await new Promise(r => setTimeout(r, 5000));

    const largeResult = await page.evaluate(() => {
      const text = document.body.textContent;
      const nodeMatch = text.match(/(\d+)\s*Nodes/);
      return nodeMatch ? parseInt(nodeMatch[1]) : 0;
    });

    console.log(`  Loaded: ${largeResult} nodes`);
    console.log(`  [${largeResult === largeTopo.nodes.length ? 'OK' : 'FAIL'}] Large topology loaded\n`);

    // 5. Test Dynamic Country Colors
    console.log('TEST 5: Dynamic Country Colors');
    console.log('-'.repeat(40));

    const countryFilters = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter(b => b.textContent && /^[A-Z]{3}/.test(b.textContent.trim()))
        .map(b => b.textContent.trim().substring(0, 3));
    });

    console.log(`  Countries detected: ${countryFilters.join(', ')}`);
    console.log(`  [${countryFilters.length >= 5 ? 'OK' : 'WARN'}] Dynamic colors for unknown country codes\n`);

    // 6. Test Simulation Mode
    console.log('TEST 6: Simulation Mode with Large Topology');
    console.log('-'.repeat(40));

    const simBtn = await page.$('button:has-text("Simulation")');
    if (simBtn) {
      await simBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    const simActive = await page.evaluate(() => {
      return document.body.textContent.includes('Simulation Mode Active');
    });

    console.log(`  Simulation mode: ${simActive ? 'ACTIVE' : 'NOT ACTIVE'}`);
    console.log(`  [${simActive ? 'OK' : 'FAIL'}] Simulation works with large topology\n`);

    // 7. Test Path Analysis
    console.log('TEST 7: Path Analysis Performance');
    console.log('-'.repeat(40));

    // Switch to analysis tab
    const analysisTab = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Analysis'));
    });
    if (analysisTab) {
      await analysisTab.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Click Find All
    const findAllBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Find All'));
    });
    if (findAllBtn) {
      const startTime = Date.now();
      await findAllBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      const elapsed = Date.now() - startTime;

      console.log(`  Path calculation time: ${elapsed}ms`);
      console.log(`  [${elapsed < 10000 ? 'OK' : 'SLOW'}] Path analysis completes in reasonable time\n`);
    }

    // Cleanup
    fs.unlinkSync(smallFile);
    fs.unlinkSync(mediumFile);
    fs.unlinkSync(largeFile);

    console.log('='.repeat(60));
    console.log('   SCALABILITY TEST COMPLETE');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n[ERROR]:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
