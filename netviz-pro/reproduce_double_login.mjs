import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:9040';
const USERNAME = 'admin';
const PASSWORD = 'admin123'; // Default from run.sh output

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function reproduceDoubleLogin() {
    console.log('🚀 Starting Double Login Reproduction...\n');

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Enable console logging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // ========================================
        // PHASE 1: Initial Load (Gateway Login)
        // ========================================
        console.log('📍 Phase 1: Loading Gateway Login Page...');
        await page.goto(APP_URL, { waitUntil: 'networkidle2' });
        await sleep(2000);

        // Check for Gateway Badge
        const gatewayBadge = await page.evaluate(() => {
            return document.body.innerText.includes('Server-side protected access');
        });

        if (gatewayBadge) {
            console.log('✓ Confirmed: On Gateway Login Page');
        } else {
            console.log('⚠️  Warning: Not on Gateway Login Page?');
            console.log('Page Text:', await page.evaluate(() => document.body.innerText.substring(0, 200)));
        }

        await page.screenshot({ path: '/Users/macbook/.gemini/repro-1-gateway-login.png', fullPage: true });

        // Login
        console.log('📍 Phase 2: Logging in via Gateway...');
        await page.type('#username', USERNAME);
        await page.type('#password', PASSWORD);
        
        const loginButton = await page.$('button[type="submit"]');
        if (loginButton) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                loginButton.click()
            ]);
            console.log('✓ Submitted Gateway Login');
        } else {
            throw new Error('Gateway login button not found');
        }

        await sleep(3000); // Wait for React app to load

        // ========================================
        // PHASE 3: Check for Second Login Screen
        // ========================================
        console.log('📍 Phase 3: Checking for React App Login Screen...');
        
        await page.screenshot({ path: '/Users/macbook/.gemini/repro-2-after-gateway-login.png', fullPage: true });

        const reactBadge = await page.evaluate(() => {
            return document.body.innerText.includes('Localhost access only');
        });

        const appLoaded = await page.evaluate(() => {
            return document.body.innerText.includes('Data Source') || document.body.innerText.includes('Topology');
        });

        if (reactBadge) {
            console.log('❌ ISSUE REPRODUCED: React App Login Screen detected!');
            console.log('   The user is forced to login TWICE.');
        } else if (appLoaded) {
            console.log('✅ App loaded successfully. No double login detected.');
        } else {
            console.log('❓ Unknown state.');
            console.log('Page Text:', await page.evaluate(() => document.body.innerText.substring(0, 200)));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

reproduceDoubleLogin();
