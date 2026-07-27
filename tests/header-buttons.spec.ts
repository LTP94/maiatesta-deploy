import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const proofDirectory = path.resolve('.visual-checks');

test.beforeAll(async () => {
  await mkdir(proofDirectory, { recursive: true });
});

test('desktop header stays glassy, condenses on scroll and never disappears', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const header = page.locator('.site-header');
  await expect(header).toBeVisible();

  const topState = await header.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      minHeight: parseFloat(style.minHeight),
      backdropFilter: style.backdropFilter,
      opacity: parseFloat(style.opacity),
    };
  });
  expect(topState.backdropFilter).toContain('blur');
  expect(topState.opacity).toBe(1);
  await page.screenshot({ path: path.join(proofDirectory, 'header-desktop-top.png'), fullPage: false });

  // Nav links are present and the comet underline is hidden until hovered.
  const navLinks = page.locator('.nav-links a');
  await expect(navLinks).toHaveCount(4);
  const firstLink = navLinks.first();
  const underlineIdle = await firstLink.evaluate(
    (el) => getComputedStyle(el, '::after').transform,
  );
  await firstLink.hover();
  await page.waitForTimeout(400);
  const underlineHover = await firstLink.evaluate(
    (el) => getComputedStyle(el, '::after').transform,
  );
  expect(underlineHover).not.toBe(underlineIdle);
  await header.screenshot({ path: path.join(proofDirectory, 'header-desktop-nav-hover.png') });

  // Scroll: header must stay visible and condense, not vanish.
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);
  const scrolledState = await header.evaluate((element) => {
    const style = getComputedStyle(element);
    return { minHeight: parseFloat(style.minHeight), opacity: parseFloat(style.opacity) };
  });
  expect(scrolledState.opacity).toBe(1);
  expect(scrolledState.minHeight).toBeLessThan(topState.minHeight);
  await expect(
    header.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const point = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return point !== null && element.contains(point);
    }),
  ).resolves.toBe(true);
  await page.screenshot({ path: path.join(proofDirectory, 'header-desktop-scrolled.png'), fullPage: false });

  expect(consoleErrors).toEqual([]);
});

test('primary CTA buttons react to the cursor and reset cleanly on leave', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const heroButton = page.locator('.hero-actions .button-primary');
  await expect(heroButton).toBeVisible();
  const box = await heroButton.boundingBox();
  if (!box) throw new Error('hero button has no bounding box');

  // Move to a corner of the button to trigger a visible magnetic offset.
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.move(box.x + 10, box.y + 10, { steps: 5 });
  await page.waitForTimeout(120);
  const midHoverTransform = await heroButton.evaluate((el) => el.style.transform);
  expect(midHoverTransform).toContain('translate3d');

  await page.mouse.move(20, 20);
  await page.waitForTimeout(500);
  const afterLeaveTransform = await heroButton.evaluate((el) => el.style.transform);
  expect(afterLeaveTransform).toBe('');

  await heroButton.screenshot({ path: path.join(proofDirectory, 'button-primary-default.png') });

  expect(consoleErrors).toEqual([]);
});

test('reduced motion disables the magnetic effect and header transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const heroButton = page.locator('.hero-actions .button-primary');
  const box = await heroButton.boundingBox();
  if (!box) throw new Error('hero button has no bounding box');

  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.move(box.x + 12, box.y + 12, { steps: 5 });
  await page.waitForTimeout(150);
  const transform = await heroButton.evaluate((el) => el.style.transform);
  expect(transform).toBe('');
});

test('mobile hamburger opens the menu and every link is reachable', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const hamburger = page.locator('.hamburger-btn');
  await expect(hamburger).toBeVisible();
  await hamburger.click();

  const mobileNav = page.locator('.mobile-nav');
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.locator('a')).toHaveCount(5); // 4 nav links + CTA
  await page.screenshot({ path: path.join(proofDirectory, 'header-mobile-menu-open.png'), fullPage: false });

  await mobileNav.locator('a').first().click();
  await expect(mobileNav).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
