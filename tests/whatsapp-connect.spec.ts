import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');
const distDir = path.resolve('dist');

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

test.describe('/whatsapp/connect — entry page', () => {
  test('renders content, security disclaimer and a disabled Meta button', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveText('Conectar WhatsApp Business');
    await expect(page.getByText(/Maiatesta no solicitará la contraseña/i)).toBeVisible();

    const connectButton = page.getByRole('button', { name: 'Conectar con Meta' });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeDisabled();

    // No technical/internal terminology should leak into the visible copy.
    const bodyText = await page.locator('main').innerText();
    for (const forbiddenTerm of ['WABA', 'OAuth', 'Graph API', 'Evolution', 'token', 'access_token']) {
      expect(bodyText).not.toContain(forbiddenTerm);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('desktop viewport has no horizontal overflow and the button is reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
    const connectButton = page.getByRole('button', { name: 'Conectar con Meta' });
    // The button sits below the shared hero (same pattern as other service
    // pages) — scroll to it rather than asserting it's visible pre-scroll.
    await connectButton.scrollIntoViewIfNeeded();
    await expect(connectButton).toBeInViewport();
    await page.screenshot({ path: path.join(proofDirectory, 'whatsapp-connect-desktop.png'), fullPage: true });
  });

  test('mobile viewport has no horizontal overflow and the button stays in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/whatsapp/connect/', { waitUntil: 'networkidle' });

    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
    const connectButton = page.getByRole('button', { name: 'Conectar con Meta' });
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
