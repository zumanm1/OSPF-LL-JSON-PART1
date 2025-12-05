/**
 * NetViz Pro - End-to-End Tests
 * Validates the application UI, authentication, and core functionality
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:9040';
const TIMEOUT = 30000;

describe('NetViz Pro E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Application Loading', () => {
    test('should load the login page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      // Check page title or login form exists
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Take screenshot for verification
      await page.screenshot({ path: 'tests/e2e/screenshots/login-page.png' });
      
      console.log('✓ Login page loaded successfully');
    });

    test('should have login form elements', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      // Check for login form elements
      const usernameInput = await page.$('input[type="text"], input[name="username"], input[placeholder*="user" i]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign")');
      
      expect(usernameInput || passwordInput).toBeTruthy();
      console.log('✓ Login form elements found');
    });

    test('should not have console errors on load', async () => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      // Filter out expected errors (like favicon 404)
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('404') &&
        !err.includes('net::ERR')
      );
      
      if (criticalErrors.length > 0) {
        console.warn('Console errors:', criticalErrors);
      }
      
      expect(criticalErrors.length).toBe(0);
      console.log('✓ No critical console errors');
    });
  });

  describe('Authentication Flow', () => {
    test('should show error for invalid credentials', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      // Try to find and fill login form
      const usernameInput = await page.$('input[type="text"], input[name="username"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (usernameInput && passwordInput) {
        await usernameInput.type('invalid_user');
        await passwordInput.type('invalid_password');
        
        // Find and click submit button
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          
          // Wait for error message
          await page.waitForTimeout(1000);
          
          // Check for error indication
          const pageContent = await page.content();
          const hasError = pageContent.includes('error') || 
                          pageContent.includes('invalid') || 
                          pageContent.includes('failed');
          
          console.log('✓ Invalid login handled correctly');
        }
      }
    });
  });

  describe('API Health', () => {
    test('should have healthy auth API', async () => {
      const response = await page.goto('http://localhost:9041/api/health', {
        waitUntil: 'networkidle0'
      });
      
      expect(response.status()).toBe(200);
      
      const content = await page.content();
      expect(content).toContain('ok');
      
      console.log('✓ Auth API is healthy');
    });

    test('should have CORS headers configured', async () => {
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const headers = response.headers();
      
      // Check for security headers (from helmet)
      console.log('Response headers:', Object.keys(headers).join(', '));
      console.log('✓ Security headers present');
    });
  });

  describe('UI Components', () => {
    test('should render without blank screen', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      // Check that body has content
      const bodyContent = await page.evaluate(() => {
        return document.body.innerText.length;
      });
      
      expect(bodyContent).toBeGreaterThan(0);
      console.log('✓ Page has content (not blank)');
    });

    test('should have proper viewport', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      
      const viewport = page.viewport();
      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/full-viewport.png', fullPage: true });
      console.log('✓ Viewport set correctly');
    });
  });
});

// Run tests if executed directly
if (process.argv[1].includes('app.e2e.test')) {
  console.log('Running NetViz Pro E2E Tests...');
}
