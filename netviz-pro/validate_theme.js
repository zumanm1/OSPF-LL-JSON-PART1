import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'validation_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    try {
        console.log('Navigating to app...');
        // Assuming app is running on localhost:5173 (Vite default)
        // If not, we might need to start it or use a different URL.
        // For this environment, we'll try to connect to the dev server if running, 
        // or we might need to rely on the user having it running. 
        // Since I can't start a long-running server easily, I'll assume it's up or I'll try to serve it statically if needed.
        // But usually in this env, I should check if it's running.
        // For now, let's assume standard Vite port.
        await page.goto('http://localhost:9040', { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
            console.log('Could not connect to localhost:9040. Please ensure the app is running.');
            process.exit(1);
        });

        console.log('Page loaded.');

        // Initial State (Should be Dark Mode)
        console.log('Checking initial state (Dark Mode)...');
        const isDarkInitially = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        console.log(`Initial Dark Mode: ${isDarkInitially}`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1_initial_dark_mode.png') });

        // Find Toggle Button
        console.log('Clicking theme toggle...');
        const toggleBtn = await page.$('button[title^="Switch to"]');
        if (!toggleBtn) {
            throw new Error('Theme toggle button not found');
        }
        await toggleBtn.click();

        // Wait for transition
        await new Promise(r => setTimeout(r, 500));

        // Check State (Should be Light Mode)
        console.log('Checking state after toggle (Light Mode)...');
        const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        console.log(`Dark Mode after toggle: ${isDarkAfter}`);

        if (isDarkAfter) {
            throw new Error('Failed to switch to light mode');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2_light_mode.png') });

        // Toggle back to Dark
        console.log('Switching back to Dark Mode...');
        await toggleBtn.click();
        await new Promise(r => setTimeout(r, 500));

        const isDarkFinal = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        console.log(`Final Dark Mode: ${isDarkFinal}`);

        if (!isDarkFinal) {
            throw new Error('Failed to switch back to dark mode');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3_back_to_dark_mode.png') });

        console.log('Validation successful!');

    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
