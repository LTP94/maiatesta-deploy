import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');
const distDir = path.resolve('dist');

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

const mockConfigResponse = {
  appId: 'test-app-id',
  configurationId: 'test-configuration-id',
  graphApiVersion: 'v25.0',
  requestedFlow: 'coexistence',
};

// Mocks the two things the entry page depends on that don't exist in the
// local dev server: the /api/meta/whatsapp/config Vercel Function, and
// Meta's own connect.facebook.net script. window.FB is a stand-in that
// records calls instead of opening a real popup — the pure state-machine
// logic (origin allowlist, message parsing, accumulator convergence) is
// covered separately by scripts/test-meta-embedded-signup.mjs, which can
// simulate a spoofed event.origin the way a real browser page cannot.
async function mockWhatsappEmbeddedSignup(page: Page) {
  await page.route('**/api/meta/whatsapp/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConfigResponse),
    }),
  );

  await page.route('https://connect.facebook.net/en_US/sdk.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__fbLoginCallCount = 0;
        window.FB = {
          init: function (options) { window.__fbInitOptions = options; },
          login: function (callback, options) {
            window.__fbLoginCallCount += 1;
            window.__lastFbLoginCallback = callback;
            window.__lastFbLoginOptions = options;
          },
        };
        if (typeof window.fbAsyncInit === 'function') {
          window.fbAsyncInit();
        }
      `,
    }),
  );
}

test.describe('/whatsapp/connect — entry page', () => {
  test('renders content, security disclaimer, and becomes ready to connect', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await mockWhatsappEmbeddedSignup(page);
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveText('Conectar WhatsApp Business');
    await expect(page.getByText(/Maiatesta no solicitará la contraseña/i)).toBeVisible();

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();
    await expect(connectButton).toHaveText('Conectar con Meta');

    // No technical/internal terminology should leak into the visible copy.
    const bodyText = await page.locator('main').innerText();
    for (const forbiddenTerm of ['WABA', 'OAuth', 'Graph API', 'Evolution', 'token', 'access_token']) {
      expect(bodyText).not.toContain(forbiddenTerm);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('shows a disabled state when the config/SDK cannot load', async ({ page }) => {
    await page.route('**/api/meta/whatsapp/config', (route) => route.fulfill({ status: 500 }));
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await expect(connectButton).toBeDisabled();
    await expect(page.getByText(/No fue posible cargar los servicios de Meta/i)).toBeVisible();
  });

  test('clicking Connect launches FB.login synchronously with the Coexistence contract', async ({ page }) => {
    await mockWhatsappEmbeddedSignup(page);
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await expect(connectButton).toBeEnabled();
    await connectButton.click();

    await expect(connectButton).toHaveText('Esperando confirmación de Meta...');
    await expect(connectButton).toBeDisabled();

    const loginOptions = await page.evaluate(() => (window as any).__lastFbLoginOptions);
    expect(loginOptions.config_id).toBe(mockConfigResponse.configurationId);
    expect(loginOptions.response_type).toBe('code');
    expect(loginOptions.override_default_response_type).toBe(true);
    expect(loginOptions.extras.featureType).toBe('whatsapp_business_app_onboarding');
    expect(loginOptions.extras.sessionInfoVersion).toBe('3');

    const initOptions = await page.evaluate(() => (window as any).__fbInitOptions);
    expect(initOptions.appId).toBe(mockConfigResponse.appId);
    expect(initOptions.version).toBe(mockConfigResponse.graphApiVersion);
  });

  test('a second click while waiting does not launch a second FB.login', async ({ page }) => {
    await mockWhatsappEmbeddedSignup(page);
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await connectButton.click();
    await expect(connectButton).toBeDisabled();
    // A disabled button does not receive real clicks, but force a click
    // straight at the handler to prove the internal guard also holds.
    await connectButton.click({ force: true });

    const callCount = await page.evaluate(() => (window as any).__fbLoginCallCount);
    expect(callCount).toBe(1);
  });

  test('an auth code received from FB.login is never sent to the network and never shown', async ({ page }) => {
    const onboardingRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/onboarding/')) {
        onboardingRequests.push(request.url());
      }
    });

    await mockWhatsappEmbeddedSignup(page);
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await connectButton.click();

    const secretCode = 'super-secret-auth-code-do-not-leak';
    await page.evaluate((code) => {
      const callback = (window as any).__lastFbLoginCallback;
      callback({ authResponse: { code }, status: 'connected' });
    }, secretCode);

    // Only one signal has arrived (the code) — the Coexistence session
    // event has not, so this must still be waiting, not "connected".
    await expect(page.getByRole('button', { name: 'Esperando confirmación de Meta...' })).toBeVisible();

    expect(onboardingRequests).toEqual([]);
    const bodyText = await page.locator('main').innerText();
    expect(bodyText).not.toContain(secretCode);
  });

  test('keyboard: Connect button is reachable and activatable via keyboard', async ({ page }) => {
    await mockWhatsappEmbeddedSignup(page);
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    const connectButton = page.getByTestId('whatsapp-connect-button');
    await expect(connectButton).toBeEnabled();
    await connectButton.focus();
    await expect(connectButton).toBeFocused();
    await page.keyboard.press('Enter');

    const callCount = await page.evaluate(() => (window as any).__fbLoginCallCount);
    expect(callCount).toBe(1);
  });

  test('desktop viewport has no horizontal overflow and the button is reachable', async ({ page }) => {
    await mockWhatsappEmbeddedSignup(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
    const connectButton = page.getByTestId('whatsapp-connect-button');
    // The button sits below the shared hero (same pattern as other service
    // pages) — scroll to it rather than asserting it's visible pre-scroll.
    await connectButton.scrollIntoViewIfNeeded();
    await expect(connectButton).toBeInViewport();
    await page.screenshot({ path: path.join(proofDirectory, 'whatsapp-connect-desktop.png'), fullPage: true });
  });

  test('mobile viewport has no horizontal overflow and the button stays in view', async ({ page }) => {
    await mockWhatsappEmbeddedSignup(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
    const connectButton = page.getByTestId('whatsapp-connect-button');
    await connectButton.scrollIntoViewIfNeeded();
    await expect(connectButton).toBeInViewport();
    await page.screenshot({ path: path.join(proofDirectory, 'whatsapp-connect-mobile.png'), fullPage: true });
  });
});

test.describe('/whatsapp/connect/callback — technical return page', () => {
  test('renders a minimal, non-functional placeholder', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/whatsapp/connect/callback/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveText('Conexión con Meta');
    await expect(page.getByText(/todavía no está habilitada/i)).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('desktop and mobile render without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/whatsapp/connect/callback/', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

// These assertions read the prerendered production output directly (not the
// dev server, which always serves the unmodified template) — run `npm run
// build` before this spec so dist/ reflects the current source.
test.describe('prerendered output (requires npm run build first)', () => {
  test('both routes are noindex, nofollow and excluded from the sitemap', async () => {
    const routeFiles = [
      path.join(distDir, 'whatsapp', 'connect', 'index.html'),
      path.join(distDir, 'whatsapp', 'connect', 'callback', 'index.html'),
    ];

    for (const filePath of routeFiles) {
      try {
        await access(filePath);
      } catch {
        test.skip(true, `${path.relative(distDir, filePath)} not found — run "npm run build" first.`);
      }
    }

    for (const filePath of routeFiles) {
      const html = await readFile(filePath, 'utf8');
      const robotsContent = html.match(/<meta\s+name="robots"\s+content="([^"]*)"\s*\/>/)?.[1];
      expect(robotsContent).toContain('noindex');
      expect(robotsContent).toContain('nofollow');
    }

    const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
    expect(sitemap).not.toContain('/whatsapp/connect/');
  });

  test('no Meta/Evolution/Chatwoot secrets leak into the built output', async () => {
    const routeFiles = [
      path.join(distDir, 'whatsapp', 'connect', 'index.html'),
      path.join(distDir, 'whatsapp', 'connect', 'callback', 'index.html'),
    ];
    const secretPatterns = [
      'APP_SECRET',
      'ACCESS_TOKEN',
      'SYSTEM_USER_TOKEN',
      'EVOLUTION_API_KEY',
      'CHATWOOT_TOKEN',
      'WHATSAPP_TOKEN',
    ];

    for (const filePath of routeFiles) {
      try {
        await access(filePath);
      } catch {
        test.skip(true, `${path.relative(distDir, filePath)} not found — run "npm run build" first.`);
      }
    }

    for (const filePath of routeFiles) {
      const html = await readFile(filePath, 'utf8');
      for (const pattern of secretPatterns) {
        expect(html).not.toContain(pattern);
      }
    }
  });
});
