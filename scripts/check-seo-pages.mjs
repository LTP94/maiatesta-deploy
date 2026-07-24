import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const remoteEditorialHosts = [
  'unsplash.com',
  'images.unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'cdn.pixabay.com',
];
const expectedEditorialAssets = [
  'guide-chatbot-lead-flow',
  'guide-web-pyme-local-seo',
  'guide-inventory-logistics-dashboard',
  'guide-excel-reporting-dashboard',
];
const expectedHomepageAssets = [
  'background/cosmic-site-desktop-poster.webp',
  'background/cosmic-site-mobile-poster.webp',
  'background/cosmic-site-desktop.webm',
  'background/cosmic-site-desktop.mp4',
  'background/cosmic-site-mobile.webm',
  'background/cosmic-site-mobile.mp4',
  'intro/why-maiatesta-poster.webp',
  'intro/why-maiatesta.webm',
  'intro/why-maiatesta.mp4',
  'cosmic/night-horizon-1400.avif',
  'cosmic/solar-orb-900.avif',
];

const sitemap = await fs.readFile(sitemapPath, 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const sourceIndex = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const vercelConfig = JSON.parse(
  await fs.readFile(path.join(root, 'vercel.json'), 'utf8'),
);

if (urls.length === 0) {
  throw new Error('No URLs found in dist/sitemap.xml. Run npm run build first.');
}

const titles = new Set();
const descriptions = new Set();
let hasFailure = false;

function routeToHtmlPath(url) {
  const route = new URL(url).pathname;
  return route === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, route, 'index.html');
}

function fail(url, message) {
  hasFailure = true;
  console.error(`${url}: ${message}`);
}

const executableInlineScripts = [
  ...sourceIndex.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/g),
].map((match) => match[1]);

for (const inlineScript of executableInlineScripts) {
  const cspHash = `sha256-${createHash('sha256')
    .update(inlineScript)
    .digest('base64')}`;

  for (const headerRule of vercelConfig.headers ?? []) {
    const contentSecurityPolicy = headerRule.headers?.find(
      (header) => header.key.toLowerCase() === 'content-security-policy',
    )?.value;

    if (contentSecurityPolicy && !contentSecurityPolicy.includes(`'${cspHash}'`)) {
      fail(
        'vercel.json',
        `${headerRule.source} CSP is missing the current inline script hash ${cspHash}`,
      );
    }
  }
}

async function collectHtmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

async function collectBuildTextFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectBuildTextFiles(entryPath);
      }

      return entry.isFile() && /\.(html|js|css)$/.test(entry.name)
        ? [entryPath]
        : [];
    }),
  );

  return files.flat();
}

for (const url of urls) {
  const htmlPath = routeToHtmlPath(url);
  let html = '';

  try {
    html = await fs.readFile(htmlPath, 'utf8');
  } catch {
    fail(url, `missing HTML file at ${path.relative(root, htmlPath)}`);
    continue;
  }

  const title = html.match(/<title>(.*?)<\/title>/)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]+)" \/>/)?.[1]?.trim();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)" \/>/)?.[1]?.trim();
  const h1 = html.match(/<h1[\s\S]*?<\/h1>/)?.[0];
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

  if (!title) {
    fail(url, 'missing title');
  } else if (titles.has(title)) {
    fail(url, `duplicate title: ${title}`);
  } else {
    titles.add(title);
  }

  if (!description || description.length < 70 || description.length > 180) {
    fail(url, `meta description should be 70-180 chars, got ${description?.length ?? 0}`);
  } else if (descriptions.has(description)) {
    fail(url, 'duplicate meta description');
  } else {
    descriptions.add(description);
  }

  if (canonical !== url) {
    fail(url, `canonical mismatch: ${canonical ?? 'missing'}`);
  }

  if (!h1) {
    fail(url, 'missing prerendered H1');
  }

  if (!jsonLd) {
    fail(url, 'missing JSON-LD');
  } else {
    try {
      const data = JSON.parse(jsonLd);
      const graph = data['@graph'] ?? [];
      const isGuidesIndex = new URL(url).pathname === '/guias/';
      const isArticle = url.includes('/guias/') && !isGuidesIndex;
      const isService = url.includes('/servicios/');

      if (
        isGuidesIndex &&
        !graph.some((item) => item['@type'] === 'CollectionPage')
      ) {
        fail(url, 'guides index missing CollectionPage schema');
      }

      if (isArticle && !graph.some((item) => item['@type'] === 'BlogPosting')) {
        fail(url, 'article page missing BlogPosting schema');
      }

      if (isService && !graph.some((item) => item['@type'] === 'Service')) {
        fail(url, 'service page missing Service schema');
      }
    } catch (error) {
      fail(url, `invalid JSON-LD: ${error.message}`);
    }
  }

  if (html.includes('name="keywords"')) {
    fail(url, 'meta keywords should not be used');
  }

  if (html.includes('hreflang="en"')) {
    fail(url, 'English hreflang exists without separate /en/ URL');
  }

  if (html.includes('noindex')) {
    fail(url, 'indexable sitemap URL contains noindex');
  }
}

for (const assetName of expectedEditorialAssets) {
  for (const extension of ['avif', 'webp']) {
    const assetPath = path.join(
      distDir,
      'assets',
      'editorial',
      `${assetName}.${extension}`,
    );

    try {
      await fs.access(assetPath);
    } catch {
      fail('editorial assets', `missing ${path.relative(root, assetPath)}`);
    }
  }
}

for (const assetName of expectedHomepageAssets) {
  const assetPath = path.join(distDir, 'assets', assetName);

  try {
    await fs.access(assetPath);
  } catch {
    fail('homepage assets', `missing ${path.relative(root, assetPath)}`);
  }
}

const htmlFiles = await collectHtmlFiles(distDir);
const buildTextFiles = await collectBuildTextFiles(distDir);
let buildText = '';

for (const filePath of buildTextFiles) {
  const fileText = await fs.readFile(filePath, 'utf8');
  buildText += `\n/* ${path.relative(distDir, filePath)} */\n${fileText}`;
}

remoteEditorialHosts.forEach((host) => {
  if (buildText.includes(host)) {
    fail('dist', `build output contains remote image host: ${host}`);
  }
});

expectedEditorialAssets.forEach((assetName) => {
  if (!buildText.includes(`/assets/editorial/${assetName}.webp`)) {
    fail('dist', `build output does not reference ${assetName}.webp`);
  }
});

expectedHomepageAssets.forEach((assetName) => {
  if (!buildText.includes(`/assets/${assetName}`)) {
    fail('dist', `build output does not reference ${assetName}`);
  }
});

for (const htmlPath of htmlFiles) {
  const html = await fs.readFile(htmlPath, 'utf8');
  const relativePath = path.relative(distDir, htmlPath);

  const editorialImageTags = [
    ...html.matchAll(/<img\b[^>]*src="\/assets\/editorial\/[^"]+\.webp"[^>]*>/g),
  ];

  editorialImageTags.forEach(([tag]) => {
    if (!/\bwidth="960"/.test(tag)) {
      fail(relativePath, `editorial image missing width="960": ${tag}`);
    }

    if (!/\bheight="540"/.test(tag)) {
      fail(relativePath, `editorial image missing height="540": ${tag}`);
    }

    if (!/\bloading="lazy"/.test(tag)) {
      fail(relativePath, `editorial image missing loading="lazy": ${tag}`);
    }

    if (!/\bdecoding="async"/.test(tag)) {
      fail(relativePath, `editorial image missing decoding="async": ${tag}`);
    }
  });
}

if (hasFailure) {
  process.exit(1);
}

console.log(
  `SEO OK: ${urls.length} sitemap URLs passed metadata, schema, canonical, indexability, and editorial image checks.`,
);
