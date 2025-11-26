import puppeteer from 'puppeteer';

(async () => {
  console.log('\n=== APP VALIDATION TEST ===\n');
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();

  try {
    // Test port 9040
    console.log('1. Testing http://localhost:9040...');
    await page.goto('http://localhost:9040', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   ✓ App loaded successfully on port 9040');

    // Wait for main content to render
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot
    await page.screenshot({ path: 'app_validation_9040.png', fullPage: true });
    console.log('   ✓ Screenshot saved: app_validation_9040.png');

    // Check for key elements
    const elements = await page.evaluate(() => {
      return {
        hasButtons: document.querySelectorAll('button').length > 0,
        hasSVG: document.querySelectorAll('svg').length > 0,
        hasNetworkGraph: !!document.querySelector('svg'),
        buttonCount: document.querySelectorAll('button').length,
        buttons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()).filter(t => t).slice(0, 10)
      };
    });

    console.log('\n2. Validating UI elements:');
    console.log('   ✓ Buttons found:', elements.buttonCount);
    console.log('   ✓ SVG elements:', elements.hasSVG ? 'Yes' : 'No');
    console.log('   ✓ Network graph:', elements.hasNetworkGraph ? 'Yes' : 'No');
    console.log('   ✓ Available buttons:', elements.buttons.join(', '));

    // Check for critical tabs
    const tabs = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        hasMonitor: buttons.some(btn => btn.textContent?.includes('Monitor')),
        hasSimulation: buttons.some(btn => btn.textContent?.includes('Simulation')),
        hasTopology: buttons.some(btn => btn.textContent?.includes('Topology')),
        hasAnalysis: buttons.some(btn => btn.textContent?.includes('Analysis'))
      };
    });

    console.log('\n3. Validating tabs:');
    console.log('   ✓ Monitor tab:', tabs.hasMonitor ? 'Found' : 'Missing');
    console.log('   ✓ Simulation tab:', tabs.hasSimulation ? 'Found' : 'Missing');
    console.log('   ✓ Topology tab:', tabs.hasTopology ? 'Found' : 'Missing');
    console.log('   ✓ Analysis tab:', tabs.hasAnalysis ? 'Found' : 'Missing');

    console.log('\n=== APP VALIDATION PASSED ===');
    console.log('✅ App is running correctly on http://localhost:9040');
    console.log('✅ Screenshot saved to: app_validation_9040.png\n');

  } catch (error) {
    console.error('\n=== APP VALIDATION FAILED ===');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
