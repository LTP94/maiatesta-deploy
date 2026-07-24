import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

test('mobile portrait and client brands remain visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const persona = page.locator('.hero-cosmos__persona img');
  await expect(persona).toBeVisible();
  expect(await persona.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.hero-copy h1')).toBeVisible();
  await page.screenshot({
    path: path.join(proofDirectory, 'mobile-hero-persona.png'),
    fullPage: false,
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const brands = page.locator('.client-ticker');
  await brands.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  const logos = brands.locator('.client-ticker__list:not([aria-hidden]) img');
  await expect(logos).toHaveCount(4);

  for (const logo of await logos.all()) {
    expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }

  await brands.screenshot({
    path: path.join(proofDirectory, 'mobile-client-brands.png'),
  });

  const bot = page.locator('.site-main-typebot-chat');
  const cosmicPanel = bot.locator('.bot-cosmic-story');
  await cosmicPanel.scrollIntoViewIfNeeded();
  await expect(cosmicPanel).toBeVisible();
  await expect(page.locator('main > .cosmic-story')).toHaveCount(0);
  expect(
    await page.evaluate(() => document.body.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await cosmicPanel.screenshot({
    path: path.join(proofDirectory, 'mobile-bot-cosmic-panel.png'),
  });
});

test('desktop portrait, brands, bot and services remain functional', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const background = page.locator('.site-video-bg');
  await expect(background).toHaveAttribute('data-video-state', 'ready', {
    timeout: 15_000,
  });
  await expect(background).toHaveAttribute('data-palette', 'atlantic');
  await expect(page.locator('.stars-bg, .hero-stars, .hero-aurora, .hero-orbs')).toHaveCount(0);
  const initialBackgroundState = await background.evaluate((element) => {
    const veil = element.querySelector('.site-video-bg__veil');
    const video = element.querySelector('video');

    return {
      currentSrc: video instanceof HTMLVideoElement ? video.currentSrc : '',
      warmTintOpacity:
        veil instanceof HTMLElement
          ? Number(getComputedStyle(veil, '::after').opacity)
          : -1,
    };
  });

  const persona = page.locator('.hero-cosmos__persona img');
  await expect(persona).toBeVisible();
  expect(await persona.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-hero-persona.png'),
    fullPage: false,
  });

  const personaCta = page.locator('.hero-persona-cta');
  await expect(personaCta).toBeVisible();
  await page.locator('.persona-portrait').click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-palette', 'current');
  await expect(background).toHaveAttribute('data-palette', 'current');
  await expect(personaCta).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.persona-portrait')).not.toHaveClass(/is-flipping/);
  const activeBackgroundState = await background.evaluate((element) => {
    const veil = element.querySelector('.site-video-bg__veil');
    const video = element.querySelector('video');

    return {
      currentSrc: video instanceof HTMLVideoElement ? video.currentSrc : '',
      warmTintOpacity:
        veil instanceof HTMLElement
          ? Number(getComputedStyle(veil, '::after').opacity)
          : -1,
    };
  });
  expect(activeBackgroundState.currentSrc).toBe(initialBackgroundState.currentSrc);
  expect(activeBackgroundState.warmTintOpacity).toBeGreaterThan(
    initialBackgroundState.warmTintOpacity,
  );
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-hero-persona-active.png'),
    fullPage: false,
  });
  await personaCta.click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-palette', 'atlantic');
  await expect(background).toHaveAttribute('data-palette', 'atlantic');
  await expect(page.locator('.persona-portrait')).not.toHaveClass(/is-flipping/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const brands = page.locator('.client-ticker');
  await brands.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  const logos = brands.locator('.client-ticker__list:not([aria-hidden]) img');
  await expect(logos).toHaveCount(4);

  for (const logo of await logos.all()) {
    expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }

  await brands.screenshot({
    path: path.join(proofDirectory, 'desktop-client-brands.png'),
  });

  const bot = page.locator('.site-main-typebot-chat');
  await bot.scrollIntoViewIfNeeded();
  await expect(page.locator('main > .cosmic-story')).toHaveCount(0);
  const cosmicPanel = bot.locator('.bot-cosmic-story');
  await expect(cosmicPanel).toBeVisible();
  await cosmicPanel.locator('.cosmic-metric').nth(2).click();
  await expect(cosmicPanel.locator('.cosmic-metric').nth(2)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await cosmicPanel.screenshot({
    path: path.join(proofDirectory, 'desktop-bot-cosmic-panel.png'),
  });
  await expect(bot.locator('.site-main-typebot-chat__placeholder')).toBeVisible();
  await bot.screenshot({
    path: path.join(proofDirectory, 'desktop-bot-integrated-ready.png'),
  });

  await bot.locator('.site-main-typebot-chat__placeholder').click();
  await expect(bot.locator('typebot-standard')).toBeAttached();
  await page.waitForFunction(
    () => {
      const host = document.querySelector('typebot-standard');
      return Boolean(host instanceof HTMLElement && host.shadowRoot?.childElementCount);
    },
    undefined,
    { timeout: 12_000 },
  );
  await page.waitForTimeout(1500);

  const botLayout = await bot.evaluate((section) => {
    const invite = section.querySelector('.bot-invite');
    const host = section.querySelector('typebot-standard');
    const sectionRect = section.getBoundingClientRect();
    const inviteRect = invite?.getBoundingClientRect();
    const hostRect = host?.getBoundingClientRect();

    return {
      bodyFitsViewport: document.body.scrollWidth <= window.innerWidth,
      inviteIsVisible:
        Boolean(inviteRect) &&
        (inviteRect?.width ?? 0) > 300 &&
        (inviteRect?.left ?? -1) >= sectionRect.left,
      hostStaysInColumn:
        Boolean(hostRect) &&
        (hostRect?.left ?? 0) > sectionRect.left + sectionRect.width * 0.45 &&
        (hostRect?.right ?? Infinity) <= sectionRect.right + 1,
    };
  });

  expect(botLayout).toEqual({
    bodyFitsViewport: true,
    inviteIsVisible: true,
    hostStaysInColumn: true,
  });
  await bot.screenshot({
    path: path.join(proofDirectory, 'desktop-bot-loaded.png'),
  });

  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-services.png'),
    fullPage: false,
  });

  expect(consoleErrors).toEqual([]);
});
