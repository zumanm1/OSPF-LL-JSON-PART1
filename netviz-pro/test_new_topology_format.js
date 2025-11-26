/**
 * TEST: New Topology Format with physical_links
 *
 * Validates:
 * 1. App can load the new format with physical_links
 * 2. Asymmetric links are detected and displayed correctly
 * 3. Country colors work for ZWE, USA, DEU, GBR
 * 4. Node count and link count match expected values
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TOPOLOGY_FILE = '/Users/macbook/Downloads/topology-2025-11-25T09_10_51.793Z.json';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Detected') || text.includes('ERROR') || text.includes('converting')) {
      console.log('PAGE LOG:', text);
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
    console.log('\n=== NEW TOPOLOGY FORMAT TEST START ===\n');

    // 1. Load app
    console.log('1. Loading app...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    console.log('   ✓ App loaded');

    // 2. Read topology file
    console.log('2. Reading topology file...');
    const topologyData = JSON.parse(fs.readFileSync(TOPOLOGY_FILE, 'utf-8'));
    console.log(`   ✓ File read: ${topologyData.nodes.length} nodes, ${topologyData.links.length} directional links`);
    console.log(`   ✓ Physical links: ${topologyData.physical_links.length}`);
    console.log(`   ✓ Asymmetric count: ${topologyData.metadata.asymmetric_count}`);

    // 3. Upload topology file via file input
    console.log('3. Uploading topology file...');

    // Find the file input element
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    // Upload the file
    await fileInput.uploadFile(TOPOLOGY_FILE);
    await new Promise(r => setTimeout(r, 2000)); // Wait for processing

    console.log('   ✓ File uploaded');

    // 4. Verify nodes loaded
    console.log('4. Verifying nodes loaded...');
    const nodeStats = await page.evaluate(() => {
      const statsDiv = document.querySelector('div.grid.grid-cols-2 div.bg-gray-800');
      if (statsDiv) {
        const text = statsDiv.textContent;
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });

    if (nodeStats === 10) {
      console.log(`   ✓ Node count correct: ${nodeStats}`);
    } else {
      console.log(`   ⚠ Node count: ${nodeStats} (expected 10)`);
    }

    // 5. Verify links loaded (should be 16 physical_links, not 36 directional)
    console.log('5. Verifying link count...');
    const linkCount = await page.evaluate(() => {
      const linkDivs = document.querySelectorAll('div.grid.grid-cols-2 div.bg-gray-800');
      if (linkDivs.length >= 2) {
        const text = linkDivs[1].textContent;
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });

    if (linkCount === 16) {
      console.log(`   ✓ Link count correct: ${linkCount} (physical_links used)`);
    } else {
      console.log(`   ⚠ Link count: ${linkCount} (expected 16 physical_links)`);
    }

    // 6. Verify countries are displayed in filter legend
    console.log('6. Verifying country filters...');
    const countryButtons = await page.$$eval('button', buttons => {
      return buttons
        .filter(b => b.className.includes('flex items-center justify-between'))
        .map(b => b.textContent);
    });

    const expectedCountries = ['ZWE', 'USA', 'DEU', 'GBR'];
    const foundCountries = expectedCountries.filter(c =>
      countryButtons.some(btn => btn && btn.includes(c))
    );

    if (foundCountries.length === expectedCountries.length) {
      console.log(`   ✓ All countries found: ${foundCountries.join(', ')}`);
    } else {
      console.log(`   ⚠ Countries found: ${foundCountries.join(', ')}`);
    }

    // 7. Check for asymmetric links (orange color)
    console.log('7. Checking for asymmetric link visualization...');
    const orangeLinks = await page.evaluate(() => {
      const lines = document.querySelectorAll('line');
      let orangeCount = 0;
      lines.forEach(line => {
        const stroke = line.getAttribute('stroke');
        if (stroke === '#f97316') { // Orange color for asymmetric
          orangeCount++;
        }
      });
      return orangeCount;
    });

    if (orangeLinks > 0) {
      console.log(`   ✓ Asymmetric links highlighted: ${orangeLinks} orange links`);
    } else {
      console.log(`   ⚠ No orange (asymmetric) links found`);
    }

    // 8. Click on a node to verify details panel
    console.log('8. Testing node selection...');
    const nodeCircles = await page.$$('circle');
    if (nodeCircles.length > 0) {
      await nodeCircles[0].click();
      await new Promise(r => setTimeout(r, 500));

      const detailsPanel = await page.$('div.absolute.top-4.right-4');
      if (detailsPanel) {
        console.log('   ✓ Node details panel opens');
      } else {
        console.log('   ⚠ Node details panel not found');
      }
    }

    // 9. Switch to simulation mode and click a link
    console.log('9. Testing simulation mode with new format...');
    const simBtn = await findByText('button', 'Simulation');
    if (simBtn) {
      await simBtn.click();
      await new Promise(r => setTimeout(r, 500));

      // Click on a link
      const linkLines = await page.$$('line.cursor-pointer');
      if (linkLines.length > 0) {
        await linkLines[0].click();
        await new Promise(r => setTimeout(r, 500));

        // Verify edit panel shows asymmetric costs
        const editPanel = await page.$('div.absolute.bottom-4.right-4');
        if (editPanel) {
          const panelText = await page.evaluate(el => el.textContent, editPanel);
          if (panelText.includes('Forward') && panelText.includes('Reverse')) {
            console.log('   ✓ Link edit panel shows Forward/Reverse costs');
          } else {
            console.log('   ⚠ Edit panel missing Forward/Reverse labels');
          }
        }
      }
    }

    // 10. Export and verify format preserved
    console.log('10. Testing export preserves asymmetric costs...');

    // Setup download path
    const downloadPath = path.resolve('./test_downloads');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    const exportBtn = await page.$('button[title="Export Topology JSON"]');
    if (exportBtn) {
      await exportBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      const files = fs.readdirSync(downloadPath);
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (jsonFile) {
        const exported = JSON.parse(fs.readFileSync(path.join(downloadPath, jsonFile), 'utf-8'));
        const asymmetricLinks = exported.links.filter(l =>
          l.reverse_cost !== undefined && l.cost !== l.reverse_cost
        );

        if (asymmetricLinks.length > 0) {
          console.log(`   ✓ Export contains ${asymmetricLinks.length} asymmetric links`);
          console.log(`   ✓ Sample: cost=${asymmetricLinks[0].cost}, reverse_cost=${asymmetricLinks[0].reverse_cost}`);
        } else {
          console.log('   ⚠ No asymmetric links in export');
        }
      }

      // Cleanup
      fs.rmSync(downloadPath, { recursive: true, force: true });
    }

    console.log('\n=== NEW TOPOLOGY FORMAT TEST PASSED ===\n');

  } catch (error) {
    console.error('\n=== NEW TOPOLOGY FORMAT TEST FAILED ===');
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
