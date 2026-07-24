import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const maxSingleLongTaskMs = 200;
const maxTotalLongTaskMs = 600;
const maxRafGapMs = 320;

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

async function walkFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

async function assertBuildHygiene() {
  const files = await walkFiles(distDir);
  const offenders = files.filter((filePath) => {
    const name = path.basename(filePath).toLowerCase();
    return name.endsWith('.mov') || name === '.ds_store';
  });

  if (offenders.length > 0) {
    throw new Error(`Build contains ignored artifacts: ${offenders.join(', ')}`);
  }
}

function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const safePath = path
        .normalize(decodeURIComponent(url.pathname))
        .replace(/^(\.\.[/\\])+/, '');
      let requestedPath = path.join(
        distDir,
        safePath === '/' ? 'index.html' : safePath,
      );

      try {
        const stat = await fs.stat(requestedPath);
        if (stat.isDirectory()) {
          requestedPath = path.join(requestedPath, 'index.html');
        }
      } catch {
        requestedPath = path.join(distDir, 'index.html');
      }

      const relativePath = path.relative(distDir, requestedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const ext = path.extname(requestedPath);
      const cacheControl = requestedPath.includes(`${path.sep}assets${path.sep}`)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate';

      const file = await fs.readFile(requestedPath);
      response.writeHead(200, {
        'Cache-Control': cacheControl,
        'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
      });
      response.end(file);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

const profiles = [
  {
    name: 'mobile-390',
    viewport: { width: 390, height: 844 },
    cpu: 4,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    maxSingleLongTaskMs,
    maxTotalLongTaskMs,
    maxRafGapMs,
  },
  {
    name: 'mobile-430',
    viewport: { width: 430, height: 932 },
    cpu: 4,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    maxSingleLongTaskMs,
    maxTotalLongTaskMs,
    maxRafGapMs,
  },
  {
    name: 'desktop-1440',
    viewport: { width: 1440, height: 900 },
    cpu: 1,
    latency: 40,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8,
    maxSingleLongTaskMs: 600,
    maxTotalLongTaskMs: 1600,
    maxRafGapMs: 600,
  },
];

await assertBuildHygiene();

const { server, port } = await createStaticServer();
const browser = await chromium.launch();

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      locale: 'es-EC',
    });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);

    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.downloadThroughput,
      uploadThroughput: profile.uploadThroughput,
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });

    await page.addInitScript(() => {
      window.__scrollPerf = {
        longTasks: [],
        rafGaps: [],
        flickEvents: [],
        videoResourcesBeforeServices: [],
      };

      document.addEventListener('maiatesta:scroll-activity', (event) => {
        window.__scrollPerf.flickEvents.push({
          time: performance.now(),
          scrollY: window.scrollY,
          detail: event.detail,
        });
      });

      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__scrollPerf.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                scrollY: window.scrollY,
              });
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch {
          // Older browsers may not expose longtask entries.
        }
      }
    });

    await page.goto(`http://127.0.0.1:${port}/`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#services', { state: 'attached' });
    await page.waitForTimeout(profile.name.startsWith('mobile') ? 900 : 3600);

    if (profile.name.startsWith('mobile')) {
      await page.evaluate(() => {
        window.__scrollPerf.flickEvents = [];
      });

      const flickDistance = await page.evaluate(
        () => Math.ceil((document.documentElement.scrollHeight - window.innerHeight) / 2),
      );
      const flickDelta = Math.max(520, Math.ceil(flickDistance / 5));

      for (let index = 0; index < 5; index += 1) {
        await page.mouse.wheel(0, flickDelta);
        await page.waitForTimeout(12);
      }

      await page.waitForTimeout(520);

      const flickResult = await page.evaluate(() => {
        const flickEvents = window.__scrollPerf.flickEvents;
        const firstFlick = flickEvents.find((event) => event.detail?.isFlicking);
        const lastFlick = [...flickEvents]
          .reverse()
          .find((event) => event.detail?.isFlicking);
        const flickStart = firstFlick?.time ?? 0;
        const flickEnd = lastFlick?.time ?? 0;
        const heavyChunksDuringFlick =
          flickStart > 0
            ? performance
                .getEntriesByType('resource')
                .filter((entry) =>
                  /(?:ProductRoulette|Projects|LocalFaq)-.*\.js(?:\?|$)|\/assets\/intro\/why-maiatesta\.(?:webm|mp4)(?:\?|$)/.test(
                    entry.name,
                  ),
                )
                .filter(
                  (entry) =>
                    entry.startTime >= flickStart && entry.startTime <= flickEnd,
                )
                .map((entry) => entry.name)
            : [];

        return {
          sawFlicking: Boolean(firstFlick),
          isFlickingAfterIdle:
            document.documentElement.classList.contains('is-flicking'),
          heavyChunksDuringFlick,
        };
      });

      if (!flickResult.sawFlicking) {
        throw new Error(`${profile.name}: is-flicking was not emitted during rapid scroll`);
      }

      if (flickResult.isFlickingAfterIdle) {
        throw new Error(`${profile.name}: is-flicking remained active after scroll idle`);
      }

      if (flickResult.heavyChunksDuringFlick.length > 0) {
        throw new Error(
          `${profile.name}: heavy chunks imported during flick: ${flickResult.heavyChunksDuringFlick.join(', ')}`,
        );
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }

    if (profile.name.startsWith('mobile')) {
      const earlyVideos = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((entry) => /\.(mp4|webm)(\?|$)/.test(entry.name))
          .map((entry) => entry.name),
      );
      const backgroundVideos = earlyVideos.filter((url) =>
        /\/assets\/background\/cosmic-site-mobile\.(?:mp4|webm)(?:\?|$)/.test(
          url,
        ),
      );
      const introVideos = earlyVideos.filter((url) =>
        /\/assets\/intro\/why-maiatesta\.(?:mp4|webm)(?:\?|$)/.test(url),
      );
      const unexpectedVideos = earlyVideos.filter(
        (url) =>
          !url.includes('/assets/background/cosmic-site-') &&
          !url.includes('/assets/intro/why-maiatesta.'),
      );

      if (unexpectedVideos.length > 0) {
        throw new Error(
          `${profile.name}: non-background video loaded before service intent/stability: ${unexpectedVideos.join(', ')}`,
        );
      }

      if (backgroundVideos.length > 1) {
        throw new Error(
          `${profile.name}: more than one responsive background video loaded: ${backgroundVideos.join(', ')}`,
        );
      }

      if (introVideos.length > 1) {
        throw new Error(
          `${profile.name}: more than one Why Maiatesta video format loaded: ${introVideos.join(', ')}`,
        );
      }
    }

    await page.evaluate(() => {
      window.__scrollPerf.longTasks = [];
      window.__scrollPerf.rafGaps = [];

      let previousFrame = performance.now();
      let isRunning = true;

      const tick = (now) => {
        if (!isRunning) {
          return;
        }

        window.__scrollPerf.rafGaps.push(now - previousFrame);
        previousFrame = now;
        requestAnimationFrame(tick);
      };

      window.__stopScrollPerf = () => {
        isRunning = false;
      };

      requestAnimationFrame(tick);
    });

    const totalScrollDistance = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    const steps = 18;
    const delta = Math.ceil(totalScrollDistance / steps);

    for (let index = 0; index < steps; index += 1) {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(80);
    }

    await page.waitForTimeout(600);
    await page.evaluate(() => window.__stopScrollPerf?.());

    const result = await page.evaluate(
      ({ maxSingleLongTask, maxTotalLongTask, maxRafGap }) => {
        const perf = window.__scrollPerf;
        const longTasks = perf.longTasks;
        const totalLongTaskTime = longTasks.reduce(
          (sum, item) => sum + item.duration,
          0,
        );
        const largestTask = longTasks.reduce(
          (largest, item) =>
            item.duration > largest.duration ? item : largest,
          { duration: 0, startTime: 0, scrollY: 0 },
        );
        const largestLongTask = largestTask.duration;
        const largestRafGap = Math.max(0, ...perf.rafGaps);

        const hiddenVisibleRevealNodes = [
          ...document.querySelectorAll('.scroll-reveal'),
        ]
          .filter((node) => node instanceof HTMLElement)
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              rect.width > 0 &&
              rect.height > 0 &&
              Number(style.opacity) === 0
            );
          })
          .slice(0, 3)
          .map((node) => node.className);

        const visibleSections = [
          ...document.querySelectorAll(
            '#services, #projects, #local-faq, #contact, .site-footer',
          ),
        ].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        });
        const collapsedSection = visibleSections.find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width < Math.min(300, window.innerWidth - 48);
        });

        if (largestLongTask > maxSingleLongTask) {
          return {
            ok: false,
            reason: `largest long task ${Math.round(
              largestLongTask,
            )}ms at scrollY ${Math.round(largestTask.scrollY)}`,
          };
        }

        if (totalLongTaskTime > maxTotalLongTask) {
          return {
            ok: false,
            reason: `total long task time ${Math.round(totalLongTaskTime)}ms`,
          };
        }

        if (largestRafGap > maxRafGap) {
          return {
            ok: false,
            reason: `largest frame gap ${Math.round(largestRafGap)}ms`,
          };
        }

        if (hiddenVisibleRevealNodes.length > 0) {
          return {
            ok: false,
            reason: `visible reveal nodes are hidden: ${hiddenVisibleRevealNodes.join(', ')}`,
          };
        }

        if (collapsedSection instanceof HTMLElement) {
          return {
            ok: false,
            reason: `visible section collapsed: ${collapsedSection.className || collapsedSection.id}`,
          };
        }

        return {
          ok: true,
          reason: `largest long task ${Math.round(
            largestLongTask,
          )}ms, total ${Math.round(totalLongTaskTime)}ms, largest frame gap ${Math.round(
            largestRafGap,
          )}ms`,
        };
      },
      {
        maxSingleLongTask: profile.maxSingleLongTaskMs,
        maxTotalLongTask: profile.maxTotalLongTaskMs,
        maxRafGap: profile.maxRafGapMs,
      },
    );

    if (!result.ok) {
      throw new Error(`${profile.name}: ${result.reason}`);
    }

    await context.close();
    console.log(`Scroll performance OK: ${profile.name} (${result.reason}).`);
  }
} finally {
  await browser.close();
  server.close();
}
