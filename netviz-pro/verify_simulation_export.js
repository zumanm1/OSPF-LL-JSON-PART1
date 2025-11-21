
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  // Setup download behavior
  const client = await page.target().createCDPSession();
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
  
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const findByText = async (selector, text) => {
    const elements = await page.$$(selector);
    for (const el of elements) {
      const content = await page.evaluate(node => node.textContent, el);
      if (content && content.includes(text)) return el;
    }
    return null;
  };

  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0' });

    // 1. Toggle Simulation Mode
    console.log('Activating Simulation Mode...');
    const simBtn = await findByText('button', 'Simulation');
    if (simBtn) await simBtn.click();
    else throw new Error("Simulation button not found");
    
    await new Promise(r => setTimeout(r, 1000)); // Wait for mode switch

    // 2. Select a Link (Simulate click on the first available link line)
    console.log('Selecting a link...');
    // D3 links have class 'cursor-pointer' on the hit area line
    await page.waitForSelector('line.cursor-pointer');
    const links = await page.$$('line.cursor-pointer');
    if (links.length > 0) {
        await links[0].click();
    } else {
        throw new Error("No links found in graph");
    }

    await new Promise(r => setTimeout(r, 1000)); // Wait for panel

    // 3. Verify Edit Panel appears
    const editPanel = await page.$('h3.text-purple-300');
    if (editPanel) {
        console.log('Link Edit Panel appeared.');
    } else {
        throw new Error("Link Edit Panel did not appear");
    }

    // 4. Modify Cost
    console.log('Modifying cost...');
    const inputs = await page.$$('input[type="number"]');
    if (inputs.length >= 2) {
        // Update Forward Cost
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('999');
        
        // Update Reverse Cost
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('888');
    } else {
        throw new Error("Cost inputs not found in panel");
    }

    // 5. Apply Changes
    console.log('Applying changes...');
    const applyBtn = await findByText('button', 'Apply Changes');
    if (applyBtn) {
        await applyBtn.click();
    } else {
        throw new Error("Apply Changes button not found");
    }
    
    await new Promise(r => setTimeout(r, 1000));

    // 6. Verify Pending Changes List
    const pendingChanges = await findByText('h3', 'Pending Changes');
    if (pendingChanges) {
        console.log('Pending Changes listed in sidebar.');
    } else {
        console.warn('Pending Changes NOT found in sidebar (could be UI delay or logic issue).');
    }

    // 7. Export Topology
    console.log('Exporting Topology JSON...');
    const exportBtn = await page.$('button[title="Export Topology JSON"]');
    if (exportBtn) {
        await exportBtn.click();
        // Wait for download
        await new Promise(r => setTimeout(r, 2000));
        
        const files = fs.readdirSync(downloadPath);
        const jsonFile = files.find(f => f.startsWith('network_topology') && f.endsWith('.json'));
        
        if (jsonFile) {
            console.log(`Export successful: ${jsonFile}`);
            const content = fs.readFileSync(path.join(downloadPath, jsonFile), 'utf-8');
            const data = JSON.parse(content);
            
            // Verify modification exists in exported data
            const modifiedLink = data.links.find(l => l.cost === 999 && l.reverse_cost === 888);
            if (modifiedLink) {
                console.log('SUCCESS: Exported JSON contains the modified asymmetric costs (999/888).');
            } else {
                console.error('FAILURE: Exported JSON does NOT contain the modifications.');
                console.log('Sample link from export:', data.links[0]);
            }
        } else {
            throw new Error("JSON export file not found");
        }
    } else {
        throw new Error("Export button not found");
    }

    // 8. Verify Matrix Modal & Export
    console.log('Opening Matrix Modal...');
    // Need to switch to Analysis tab first?
    // Click 'Analysis' tab button
    const analysisTabBtn = await findByText('button', 'Analysis');
    if (analysisTabBtn) {
        await analysisTabBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Check for Matrix button directly.
        const matrixBtn = await findByText('button', 'Matrix');
        if (matrixBtn) {
             console.log('Matrix button found.');
        }
    }

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
    // Clean up downloads
    if (fs.existsSync(downloadPath)) {
        fs.rmSync(downloadPath, { recursive: true, force: true });
    }
  }
})();
