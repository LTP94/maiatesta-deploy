import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const maxVisibleOpacityZero = 0;

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
  const files = await walkFiles(path.join(distDir, 'assets'));
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
      const requestedPath = path.join(
        distDir,
        safePath === '/' ? 'index.html' : safePath,
      );
      const relativePath = path.relative(distDir, requestedPath);

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const file = await fs.readFile(requestedPath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type':
          contentTypes[path.extname(requestedPath)] ?? 'application/octet-stream',
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
  },
  {
    name: 'mobile-430',
    viewport: { width: 430, height: 932 },
    cpu: 4,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  },
  {
    name: 'desktop-1440',
    viewport: { width: 1440, height: 900 },
    cpu: 1,
    latency: 40,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8,
  },
];

const scrollTargets = ['#services', '#projects', '#local-faq', '#contact'];

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

    await page.goto(`http://127.0.0.1:${port}/`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#services', { state: 'attached' });

    for (const target of scrollTargets) {
      await page.waitForSelector(target, { state: 'attached' });
      await page.locator(target).scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);

      const result = await page.evaluate(
        ({ targetSelector, visibleOpacityLimit }) => {
          const targetNode = document.querySelector(targetSelector);

          if (!(targetNode instanceof HTMLElement)) {
            return { ok: false, reason: `${targetSelector} is missing` };
          }

          const rect = targetNode.getBoundingClientRect();
          const style = getComputedStyle(targetNode);
          const visibleRevealNodes = [...document.querySelectorAll('.scroll-reveal')]
            .filter((node) => node instanceof HTMLElement)
            .map((node) => {
              const nodeRect = node.getBoundingClientRect();
              const nodeStyle = getComputedStyle(node);
              return {
                className: node.className,
                opacity: Number(nodeStyle.opacity),
                visible:
                  nodeRect.bottom > 0 &&
                  nodeRect.top < window.innerHeight &&
                  nodeRect.width > 0 &&
                  nodeRect.height > 0,
              };
            })
            .filter((node) => node.visible && node.opacity <= visibleOpacityLimit);

          if (rect.width < Math.min(300, window.innerWidth - 48)) {
            return {
              ok: false,
              reason: `${targetSelector} has raw/narrow width ${Math.round(rect.width)}`,
            };
          }

          if (rect.height < 120) {
            return {
              ok: false,
              reason: `${targetSelector} has suspicious height ${Math.round(rect.height)}`,
            };
          }

          if (Number(style.opacity) === 0 || style.display === 'inline') {
            return {
              ok: false,
              reason: `${targetSelector} has unstyled display/opacity`,
            };
          }

          if (visibleRevealNodes.length > 0) {
            return {
              ok: false,
              reason: `visible reveal nodes are hidden: ${JSON.stringify(
                visibleRevealNodes.slice(0, 3),
              )}`,
            };
          }

          if (targetSelector === '#services') {
            const preview = document.querySelector(
              '.service-card.active .service-card-preview',
            );
            const media = preview?.querySelector('img, video');

            if (!(preview instanceof HTMLElement) || !(media instanceof HTMLElement)) {
              return {
                ok: false,
                reason: 'active service preview media is missing',
              };
            }

            const previewRect = preview.getBoundingClientRect();
            if (previewRect.width < 180 || previewRect.height < 100) {
              return {
                ok: false,
                reason: `active service preview is too small: ${Math.round(
                  previewRect.width,
                )}x${Math.round(previewRect.height)}`,
              };
            }
          }

          if (targetSelector === '#contact') {
            const form = document.querySelector('.contact-form');
            if (!(form instanceof HTMLElement)) {
              return { ok: false, reason: 'contact form is missing' };
            }

            const formStyle = getComputedStyle(form);
            if (formStyle.display !== 'grid') {
              return {
                ok: false,
                reason: `contact form display is ${formStyle.display}`,
              };
            }
          }

          return { ok: true, reason: 'ok' };
        },
        { targetSelector: target, visibleOpacityLimit: maxVisibleOpacityZero },
      );

      if (!result.ok) {
        throw new Error(`${profile.name} ${target}: ${result.reason}`);
      }
    }

    await context.close();
    console.log(`Scroll load OK: ${profile.name}.`);
  }
} finally {
  await browser.close();
  server.close();
}
