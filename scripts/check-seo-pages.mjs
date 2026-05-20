import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const sitemapPath = path.join(distDir, 'sitemap.xml');

const sitemap = await fs.readFile(sitemapPath, 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

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

if (hasFailure) {
  process.exit(1);
}

console.log(`SEO OK: ${urls.length} sitemap URLs passed metadata, schema, canonical, and indexability checks.`);
