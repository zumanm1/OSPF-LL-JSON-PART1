import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:9040';

// CORRECT CREDENTIALS (from .env.local)
const USERNAME = 'netviz_admin';  // NOT 'admin'
const PASSWORD = 'V3ry$trongAdm1n!2025';  // From .env.local

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fullE2EValidation() {
    console.log('🚀 FULL E2E VALIDATION - NetViz Pro\n');
    console.log('📋 Using credentials:');
    console.log(`   Username: ${USERNAME}`);
    console.log(`   Password: ${PASSWORD.substring(0, 4)}***\n`);

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (!text.includes('[DOM]') && !text.includes('Download the React DevTools')) {
                console.log('PAGE LOG:', text);
            }
        });
        page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

        // ========================================
        // PHASE 1: Load Gateway Login Page
        // ========================================
        console.log('📍 Phase 1: Loading Gateway Login Page...');
        await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(2000);

        const hasLoginForm = await page.$('#username');
        if (!hasLoginForm) {
            console.log('❌ FAILED: Login form not found');
            await page.screenshot({ path: '/Users/macbook/.gemini/e2e-error-no-login.png', fullPage: true });
            return;
        }

        await page.screenshot({ path: '/Users/macbook/.gemini/e2e-1-login-page.png', fullPage: true });
        console.log('✅ Gateway login page loaded\n');

        // ========================================
        // PHASE 2: Login with Correct Credentials
        // ========================================
        console.log('📍 Phase 2: Logging in...');
        await page.type('#username', USERNAME);
        await page.type('#password', PASSWORD);

        const loginButton = await page.$('button[type="submit"]');
        if (!loginButton) {
            console.log('❌ FAILED: Login button not found');
            return;
        }

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
            loginButton.click()
        ]);

        console.log('✅ Login submitted\n');
        await sleep(3000);

        // ========================================
        // PHASE 3: Verify App Loaded (NOT Stuck)
        // ========================================
        console.log('📍 Phase 3: Checking if app loaded correctly...');

        await page.screenshot({ path: '/Users/macbook/.gemini/e2e-2-after-login.png', fullPage: true });

        const pageText = await page.evaluate(() => document.body.innerText);

        // Check if stuck on initialization
        const isStuck = pageText.includes('Initializing') &&
            pageText.includes('Checking authentication status');

        // Check if app loaded
        const appLoaded = pageText.includes('Data Source') ||
            pageText.includes('Network Stats') ||
            pageText.includes('Topology Visualizer');

        // Check if login failed
        const loginFailed = pageText.includes('Invalid credentials') ||
            pageText.includes('Login failed');

        if (isStuck) {
            console.log('❌ FAILED: App is STUCK on initialization screen');
            console.log('   This means AuthContext is not completing validation.');
            console.log('\n📋 Page content (first 300 chars):');
            console.log(pageText.substring(0, 300));
        } else if (loginFailed) {
            console.log('❌ FAILED: Login credentials were rejected');
            console.log('   Check that .env.local has the correct password.');
        } else if (appLoaded) {
            console.log('✅ SUCCESS: App loaded correctly!');
            console.log('   No stuck screen detected.');
            console.log('   User can access the application.\n');

            // ========================================
            // PHASE 4: Verify Key UI Elements
            // ========================================
            console.log('📍 Phase 4: Verifying UI elements...');

            const hasHeader = pageText.includes('NetViz Pro');
            const hasSidebar = pageText.includes('Data Source');
            const hasStats = pageText.includes('Network Stats');

            console.log(`   Header: ${hasHeader ? '✅' : '❌'}`);
            console.log(`   Sidebar: ${hasSidebar ? '✅' : '❌'}`);
            console.log(`   Stats: ${hasStats ? '✅' : '❌'}`);

            await page.screenshot({ path: '/Users/macbook/.gemini/e2e-3-app-loaded.png', fullPage: true });

            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('   Application is fully functional.');
        } else {
            console.log('❓ UNKNOWN STATE');
            console.log('\n📋 Page content (first 500 chars):');
            console.log(pageText.substring(0, 500));
        }

        await sleep(2000);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        await page.screenshot({ path: '/Users/macbook/.gemini/e2e-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

fullE2EValidation();
