import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');
const distDir = path.resolve('dist');

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

async function expectNoOverflow(page: import('@playwright/test').Page, url: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
}

test.describe('/politica-de-privacidad — existing privacy policy', () => {
  test('renders single H1, no console errors, and links to data deletion', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/politica-de-privacidad/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByText(/eliminacion-de-datos/i)).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('/terminos — Terms of Service', () => {
  test('renders H1, links to privacy policy, and shows contact section', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/terminos/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Términos de Servicio');
    await expect(page.locator('a[href="/politica-de-privacidad/"]')).toHaveCount(1);
    await expect(page.locator('main').getByText('ventas@maiatesta.com')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('desktop and mobile render without horizontal overflow', async ({ page }) => {
    await expectNoOverflow(page, '/terminos/');
    await page.screenshot({ path: path.join(proofDirectory, 'terminos-mobile.png'), fullPage: true });
  });
});

test.describe('/eliminacion-de-datos — Data Deletion Instructions', () => {
  test('renders H1, real contact, instructions, and no sensitive-data form', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/eliminacion-de-datos/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Eliminación de datos');
    await expect(page.getByText('emilio@maiatesta.com').first()).toBeVisible();

    // Publicly accessible instructions page — no login/auth form, no request
    // for passwords, OTPs, or access tokens.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    // The page legitimately states it will NOT request an OTP/token (so those
    // words appear in prose) — only technical/internal identifiers must never leak.
    const bodyText = await page.locator('main').innerText();
    for (const forbiddenTerm of ['access_token', 'WABA_ID', 'PHONE_NUMBER_ID']) {
      expect(bodyText).not.toContain(forbiddenTerm);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('desktop and mobile render without horizontal overflow', async ({ page }) => {
    await expectNoOverflow(page, '/eliminacion-de-datos/');
    await page.screenshot({ path: path.join(proofDirectory, 'eliminacion-de-datos-mobile.png'), fullPage: true });
  });
});

// These assertions read the prerendered production output directly — run
// `npm run build` before this spec so dist/ reflects the current source.
test.describe('prerendered output (requires npm run build first)', () => {
  const routeFiles = [
    { route: '/terminos/', filePath: path.join(distDir, 'terminos', 'index.html') },
    { route: '/eliminacion-de-datos/', filePath: path.join(distDir, 'eliminacion-de-datos', 'index.html') },
  ];

  test('both new legal routes are indexable and have title/canonical', async () => {
    for (const { filePath } of routeFiles) {
      try {
        await access(filePath);
      } catch {
        test.skip(true, `${path.relative(distDir, filePath)} not found — run "npm run build" first.`);
      }
    }

    for (const { route, filePath } of routeFiles) {
      const html = await readFile(filePath, 'utf8');
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain(`<link rel="canonical" href="https://maiatesta.com${route}" />`);
      const robotsContent = html.match(/<meta\s+name="robots"\s+content="([^"]*)"\s*\/>/)?.[1] ?? 'index, follow';
      expect(robotsContent).not.toContain('noindex');
    }

    const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
    for (const { route } of routeFiles) {
      expect(sitemap).toContain(route);
    }
  });

  test('no secrets or credentials leak into the built output', async () => {
    for (const { filePath } of routeFiles) {
      try {
        await access(filePath);
      } catch {
        test.skip(true, `${path.relative(distDir, filePath)} not found — run "npm run build" first.`);
      }
    }

    const secretPatterns = [
      'APP_SECRET',
      'ACCESS_TOKEN',
      'SYSTEM_USER_TOKEN',
      'EVOLUTION_API_KEY',
      'CHATWOOT_TOKEN',
      'WHATSAPP_TOKEN',
      'PHONE_NUMBER_ID=',
      'WABA_ID=',
    ];

    for (const { filePath } of routeFiles) {
      const html = await readFile(filePath, 'utf8');
      for (const pattern of secretPatterns) {
        expect(html).not.toContain(pattern);
      }
    }
  });
});
