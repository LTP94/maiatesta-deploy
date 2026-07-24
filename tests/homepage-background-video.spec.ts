import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');

test.describe.configure({ timeout: 45_000 });

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

async function waitForBackgroundVideo(page: Page) {
  const host = page.locator('.site-video-bg');
  await expect(host).toHaveAttribute('data-video-state', 'ready', {
    timeout: 15_000,
  });

  const video = host.locator('video');
  await expect(video).toBeAttached();
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => ({
        height: element.videoHeight,
        paused: element.paused,
        readyState: element.readyState,
        width: element.videoWidth,
      })),
    )
    .toMatchObject({ paused: false, readyState: 4 });

  return { host, video };
}

async function jumpTo(page: Page, selector: string) {
  const section = page.locator(selector);

  // Re-anchor while upstream lazy content settles. This keeps the target near
  // the viewport so its own performance gate can hydrate it.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.waitForTimeout(450);
    await section.evaluate((element) => {
      document.documentElement.style.scrollBehavior = 'auto';
      const targetTop =
        element.getBoundingClientRect().top + window.scrollY - 104;
      window.scrollTo(0, targetTop);
    });
  }

  await expect(section).not.toHaveAttribute('aria-busy', 'true', {
    timeout: 15_000,
  });

  // The shell-to-component swap can make one final size correction.
  await section.evaluate((element) => {
    const targetTop =
      element.getBoundingClientRect().top + window.scrollY - 104;
    window.scrollTo(0, targetTop);
  });
  await page.waitForTimeout(350);
}

async function expectHeaderToBeUnobstructed(page: Page) {
  const header = page.locator('.site-header');
  await expect(header).toBeVisible();
  expect(
    await header.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const point = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );

      return point !== null && element.contains(point);
    }),
  ).toBe(true);
}

test('desktop uses one fitted Vecteezy video while headings remain visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const { host, video } = await waitForBackgroundVideo(page);
  const videoState = await video.evaluate((element: HTMLVideoElement) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      currentSrc: element.currentSrc,
      height: rect.height,
      loop: element.loop,
      muted: element.muted,
      objectFit: style.objectFit,
      videoHeight: element.videoHeight,
      videoWidth: element.videoWidth,
      width: rect.width,
    };
  });

  expect(videoState.currentSrc).toMatch(/cosmic-site-desktop\.(webm|mp4)$/);
  expect(videoState.currentSrc).not.toContain('mobile');
  expect(videoState.videoWidth).toBe(1280);
  expect(videoState.videoHeight).toBe(720);
  expect(videoState.objectFit).toBe('cover');
  expect(videoState.loop).toBe(true);
  expect(videoState.muted).toBe(true);
  expect(videoState.width).toBe(1440);
  expect(videoState.height).toBe(900);
  await expect(page.locator('.hero-copy h1')).toBeVisible();
  await expect(page.locator('.site-video-bg__veil')).toBeVisible();
  expect(await page.locator('.site-video-bg video').count()).toBe(1);
  expect(await page.locator('.stars-bg, .hero-stars, .hero-space-photo').count()).toBe(0);
  const legacyBackgroundRequests = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) =>
        /(?:milky-way-(?:760|1440)|stars-layer-bg|section-stars-bg|hero-(?:mobile|poster))/.test(
          url,
        ),
      ),
  );
  expect(legacyBackgroundRequests).toEqual([]);
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);

  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-video-hero.png'),
    fullPage: false,
  });

  await jumpTo(page, '#services');
  await expect(page.locator('#services h2')).toBeVisible();
  await expectHeaderToBeUnobstructed(page);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-video-services.png'),
    fullPage: false,
  });

  await jumpTo(page, '#contact');
  await expect(page.locator('#contact h2')).toBeVisible();
  await expectHeaderToBeUnobstructed(page);
  await expect(host).toHaveAttribute('data-video-state', 'ready');
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-video-contact.png'),
    fullPage: false,
  });
});

test('Why Maiatesta uses the lazy intro video and the bot inherits the Quito image', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const story = page.locator('.bot-cosmic-story');
  await jumpTo(page, '.bot-cosmic-story');
  await expect(story).toBeVisible();
  await expect(story.locator('.cosmic-story__visual img')).toHaveCount(0);

  const introVideo = story.locator('.cosmic-story__video');
  await expect
    .poll(() =>
      introVideo.evaluate((element: HTMLVideoElement) => ({
        currentSrc: element.currentSrc,
        height: element.videoHeight,
        muted: element.muted,
        width: element.videoWidth,
      })),
    )
    .toMatchObject({ height: 960, muted: true, width: 540 });
  expect(
    await introVideo.evaluate((element: HTMLVideoElement) => element.currentSrc),
  ).toMatch(/\/assets\/intro\/why-maiatesta\.(?:webm|mp4)$/);

  const letterMotion = await story
    .locator('.cosmic-story__copy .luminous-accent')
    .first()
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(letterMotion).toContain('section-letter-signal');

  const audioButton = story.locator('.cosmic-story__audio-cta');
  await expect(audioButton).toBeVisible();
  await audioButton.click();
  await expect
    .poll(() =>
      introVideo.evaluate((element: HTMLVideoElement) => element.muted),
    )
    .toBe(false);

  await story.screenshot({
    path: path.join(proofDirectory, 'desktop-why-intro-video.png'),
  });

  const botSurface = page.locator('.site-main-typebot-chat__inner');
  const botBackground = await botSurface.evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return {
      animationName: style.animationName,
      backgroundImage: style.backgroundImage,
    };
  });
  expect(botBackground.backgroundImage).toContain(
    '/assets/cosmic/night-horizon-1400.avif',
  );
  expect(botBackground.animationName).toContain('bot-horizon-drift');
  await botSurface.screenshot({
    path: path.join(proofDirectory, 'desktop-bot-image-background.png'),
  });
});

test('mobile selects the portrait crop and keeps every viewport free of overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const { host, video } = await waitForBackgroundVideo(page);
  const videoState = await video.evaluate((element: HTMLVideoElement) => ({
    currentSrc: element.currentSrc,
    height: element.getBoundingClientRect().height,
    videoHeight: element.videoHeight,
    videoWidth: element.videoWidth,
    width: element.getBoundingClientRect().width,
  }));

  expect(videoState.currentSrc).toMatch(/cosmic-site-mobile\.(webm|mp4)$/);
  expect(videoState.videoWidth).toBe(540);
  expect(videoState.videoHeight).toBe(960);
  expect(videoState.width).toBe(390);
  expect(videoState.height).toBe(844);
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('.hero-copy h1')).toBeVisible();

  await page.screenshot({
    path: path.join(proofDirectory, 'mobile-video-hero.png'),
    fullPage: false,
  });

  await jumpTo(page, '#services');
  await expect(page.locator('#services h2')).toBeVisible();
  await expectHeaderToBeUnobstructed(page);
  await page.screenshot({
    path: path.join(proofDirectory, 'mobile-video-services.png'),
    fullPage: false,
  });

  await jumpTo(page, '#contact');
  await expect(page.locator('#contact h2')).toBeVisible();
  await expectHeaderToBeUnobstructed(page);
  await expect(host).toHaveAttribute('data-video-state', 'ready');
  await page.screenshot({
    path: path.join(proofDirectory, 'mobile-video-contact.png'),
    fullPage: false,
  });
});

test('reduced motion and save-data visitors receive the responsive poster only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  const host = page.locator('.site-video-bg');
  await expect(host).toHaveAttribute('data-video-state', 'poster');
  await expect(host.locator('video')).toHaveCount(0);
  const poster = host.locator('.site-video-bg__poster img');
  await expect(poster).toBeVisible();
  expect(await poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.hero-copy h1')).toBeVisible();
  await page.screenshot({
    path: path.join(proofDirectory, 'mobile-video-reduced-motion-poster.png'),
    fullPage: false,
  });
});

test('save-data disables the video without hiding content', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '4g', saveData: true },
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  await expect(page.locator('.site-video-bg')).toHaveAttribute(
    'data-video-state',
    'poster',
  );
  await expect(page.locator('.site-video-bg video')).toHaveCount(0);
  await expect(page.locator('.hero-copy h1')).toBeVisible();
});

test('the responsive background also runs on a service route with attribution', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/servicios/desarrollo-web-quito/', {
    waitUntil: 'domcontentloaded',
  });

  const { host } = await waitForBackgroundVideo(page);
  await expect(page.locator('.service-page-hero h1')).toBeVisible();
  await expect(host).toHaveAttribute('data-video-state', 'ready');
  await page.screenshot({
    path: path.join(proofDirectory, 'desktop-video-service-route.png'),
    fullPage: false,
  });

  await jumpTo(page, '.site-footer');
  await expect(
    page.getByRole('link', { name: 'Video de fondo: Vecteezy' }),
  ).toBeVisible();
});
