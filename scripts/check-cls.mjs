import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const maxCls = 0.1;

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const safePath = path
        .normalize(decodeURIComponent(url.pathname))
        .replace(/^(\.\.[/\\])+/, '');
      const requestedPath = path.join(distDir, safePath === '/' ? 'index.html' : safePath);
      const relativePath = path.relative(distDir, requestedPath);

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const file = await fs.readFile(requestedPath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypes[path.extname(requestedPath)] ?? 'application/octet-stream',
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

const { server, port } = await createStaticServer();
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    locale: 'es-EC',
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.addInitScript(() => {
    window.__maiatestaCls = 0;
    window.__maiatestaClsEntries = [];

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__maiatestaCls += entry.value;
          window.__maiatestaClsEntries.push({
            value: entry.value,
            sources: entry.sources?.map((source) => source.node?.outerHTML?.slice(0, 160)) ?? [],
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const viewport = page.viewportSize() ?? { height: 812 };
  for (let step = 0; step < 8; step += 1) {
    await page.mouse.wheel(0, Math.round(viewport.height * 0.75));
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(800);

  const cls = await page.evaluate(() => window.__maiatestaCls);
  const entries = await page.evaluate(() => window.__maiatestaClsEntries);

  if (cls > maxCls) {
    console.error(`CLS regression: ${cls.toFixed(4)} is above the ${maxCls} limit.`);
    console.error(JSON.stringify(entries, null, 2));
    process.exit(1);
  }

  console.log(`CLS OK: ${cls.toFixed(4)}.`);
} finally {
  await browser.close();
  server.close();
}
