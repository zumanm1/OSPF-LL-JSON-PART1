import puppeteer from 'puppeteer';
import fs from 'fs';

const APP_URL = 'http://localhost:9040';
const USERNAME = 'netviz_admin';
const PASSWORD = 'V3ry$trongAdm1n!2025';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureProof() {
    console.log('🔍 DETAILED DIAGNOSTIC - Capturing Proof\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const diagnosticLog = [];

    try {
        const page = await browser.newPage();

        // Capture ALL network requests
        const requests = [];
        page.on('request', req => {
            requests.push({
                url: req.url(),
                method: req.method(),
                headers: req.headers()
            });
        });

        // Capture ALL responses
        const responses = [];
        page.on('response', async resp => {
            const url = resp.url();
            responses.push({
                url: url,
                status: resp.status(),
                statusText: resp.statusText(),
                headers: resp.headers()
            });

            // Log API calls specifically
            if (url.includes('/api/')) {
                console.log(`📡 API Call: ${resp.status()} ${url}`);
                try {
                    const text = await resp.text();
                    console.log(`   Response: ${text.substring(0, 200)}`);
                } catch (e) {
                    console.log(`   (Could not read response body)`);
                }
            }
        });

        // Capture console logs
        page.on('console', msg => {
            const text = msg.text();
            diagnosticLog.push(`CONSOLE: ${text}`);
            if (!text.includes('[DOM]') && !text.includes('DevTools')) {
                console.log(`💬 ${text}`);
            }
        });

        // Capture errors
        page.on('pageerror', err => {
            const msg = `ERROR: ${err.message}`;
            diagnosticLog.push(msg);
            console.error(`❌ ${msg}`);
        });

        // ========================================
        // STEP 1: Load Login Page
        // ========================================
        console.log('\n📍 STEP 1: Loading login page...');
        await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(2000);

        await page.screenshot({
            path: '/Users/macbook/.gemini/proof-1-login.png',
            fullPage: true
        });
        console.log('✅ Screenshot saved: proof-1-login.png');

        // ========================================
        // STEP 2: Login
        // ========================================
        console.log('\n📍 STEP 2: Logging in...');
        await page.type('#username', USERNAME);
        await page.type('#password', PASSWORD);

        const loginButton = await page.$('button[type="submit"]');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
            loginButton.click()
        ]);

        console.log('✅ Login submitted');
        await sleep(5000); // Wait longer to see what happens

        // ========================================
        // STEP 3: Capture Current State
        // ========================================
        console.log('\n📍 STEP 3: Analyzing current state...');

        await page.screenshot({
            path: '/Users/macbook/.gemini/proof-2-after-login.png',
            fullPage: true
        });
        console.log('✅ Screenshot saved: proof-2-after-login.png');

        // Get page HTML
        const html = await page.content();
        fs.writeFileSync('/Users/macbook/.gemini/proof-page-html.html', html);
        console.log('✅ HTML saved: proof-page-html.html');

        // Get visible text
        const pageText = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('/Users/macbook/.gemini/proof-page-text.txt', pageText);
        console.log('✅ Text saved: proof-page-text.txt');

        // Check specific conditions
        const analysis = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                hasInitializing: text.includes('Initializing'),
                hasCheckingAuth: text.includes('Checking authentication status'),
                hasDataSource: text.includes('Data Source'),
                hasNetVizPro: text.includes('NetViz Pro'),
                hasNetworkStats: text.includes('Network Stats'),
                hasLoginScreen: text.includes('Sign In'),
                bodyClasses: document.body.className,
                rootContent: document.getElementById('root')?.innerHTML.substring(0, 500)
            };
        });

        console.log('\n📊 PAGE ANALYSIS:');
        console.log(`   Stuck on "Initializing": ${analysis.hasInitializing && analysis.hasCheckingAuth ? '❌ YES' : '✅ NO'}`);
        console.log(`   Shows "Data Source": ${analysis.hasDataSource ? '✅ YES' : '❌ NO'}`);
        console.log(`   Shows "NetViz Pro": ${analysis.hasNetVizPro ? '✅ YES' : '❌ NO'}`);
        console.log(`   Shows "Network Stats": ${analysis.hasNetworkStats ? '✅ YES' : '❌ NO'}`);
        console.log(`   Shows Login Screen: ${analysis.hasLoginScreen ? '⚠️ YES' : '✅ NO'}`);

        // Check for API calls
        const apiCalls = responses.filter(r => r.url.includes('/api/'));
        console.log(`\n📡 API CALLS MADE: ${apiCalls.length}`);
        apiCalls.forEach(call => {
            console.log(`   ${call.status} ${call.url}`);
        });

        // Save diagnostic data
        const diagnostic = {
            timestamp: new Date().toISOString(),
            analysis,
            apiCalls: apiCalls.map(c => ({ url: c.url, status: c.status })),
            consoleLog: diagnosticLog,
            pageTextPreview: pageText.substring(0, 1000)
        };

        fs.writeFileSync(
            '/Users/macbook/.gemini/proof-diagnostic.json',
            JSON.stringify(diagnostic, null, 2)
        );
        console.log('✅ Diagnostic data saved: proof-diagnostic.json');

        // Final verdict
        console.log('\n' + '='.repeat(60));
        if (analysis.hasInitializing && analysis.hasCheckingAuth) {
            console.log('❌ VERDICT: App is STUCK on initialization screen');
            console.log('   The AuthContext is not completing validation.');
        } else if (analysis.hasDataSource || analysis.hasNetworkStats) {
            console.log('✅ VERDICT: App LOADED successfully');
            console.log('   User can access the application.');
        } else if (analysis.hasLoginScreen) {
            console.log('⚠️ VERDICT: Still showing login screen');
            console.log('   Login may have failed or redirected back.');
        } else {
            console.log('❓ VERDICT: Unknown state');
        }
        console.log('='.repeat(60));

        await sleep(3000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: '/Users/macbook/.gemini/proof-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

captureProof();
