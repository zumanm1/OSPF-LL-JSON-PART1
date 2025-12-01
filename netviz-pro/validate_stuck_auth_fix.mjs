import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:9040';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateStuckAuth() {
    console.log('🚀 Testing: Auth Stuck Issue Fix...\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Enable console logging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.error('PAGE ERROR:', err));

        // ========================================
        // PHASE 1: Load and Login
        // ========================================
        console.log('📍 Phase 1: Loading and logging in...');
        await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 10000 });
        await sleep(2000);

        await page.screenshot({ path: '/Users/macbook/.gemini/fix-1-login-page.png', fullPage: true });

        // Login
        await page.type('#username', USERNAME);
        await page.type('#password', PASSWORD);

        const loginButton = await page.$('button[type="submit"]');
        if (loginButton) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                loginButton.click()
            ]);
            console.log('✓ Logged in');
        }

        await sleep(3000);

        // ========================================
        // PHASE 2: Check if App Loaded (NOT Stuck)
        // ========================================
        console.log('📍 Phase 2: Checking if app loaded...');

        await page.screenshot({ path: '/Users/macbook/.gemini/fix-2-after-login.png', fullPage: true });

        const isStuck = await page.evaluate(() => {
            return document.body.innerText.includes('Initializing') &&
                document.body.innerText.includes('Checking authentication status');
        });

        const appLoaded = await page.evaluate(() => {
            return document.body.innerText.includes('Data Source') ||
                document.body.innerText.includes('NetViz Pro') ||
                document.body.innerText.includes('Topology');
        });

        if (isStuck) {
            console.log('❌ FAILED: App is still stuck on "Initializing..."');
            console.log('   The auth validation is not completing.');
        } else if (appLoaded) {
            console.log('✅ SUCCESS: App loaded correctly!');
            console.log('   No longer stuck on initialization screen.');
        } else {
            console.log('❓ UNKNOWN: App state unclear');
            console.log('Page Text:', await page.evaluate(() => document.body.innerText.substring(0, 200)));
        }

        await sleep(2000);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/Users/macbook/.gemini/fix-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

validateStuckAuth();
