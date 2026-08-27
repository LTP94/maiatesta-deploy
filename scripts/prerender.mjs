import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientIndexPath = path.join(root, 'dist', 'index.html');
const serverOutDir = path.join(root, '.ssg-server');
const serverEntryPath = path.join(serverOutDir, 'entry-server.js');

const template = await fs.readFile(clientIndexPath, 'utf8');
const {
  getRouteSeo,
  getRouteStructuredData,
  getStaticRoutes,
  noindexRoutes,
  render,
} = await import(`file://${serverEntryPath}`);

if (!template.includes('<!--app-html-->')) {
  throw new Error('Missing <!--app-html--> placeholder in dist/index.html');
}

const escapeAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const injectHead = (html, routePath) => {
  const seo = getRouteSeo(routePath);
  const structuredData = JSON.stringify(getRouteStructuredData(routePath), null, 2);

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(seo.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeAttribute(seo.description)}" />`,
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/,
      `<meta name="robots" content="${escapeAttribute(seo.robots ?? 'index, follow')}" />`,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeAttribute(seo.canonical)}" />`,
    )
    .replace(
      /<link\s+rel="alternate"\s+hreflang="es"\s+href="[^"]*"\s*\/>/,
      `<link rel="alternate" hreflang="es" href="${escapeAttribute(seo.canonical)}" />`,
    )
    // x-default hreflang removed — site is Spanish-only with no international routing strategy
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:type" content="${escapeAttribute(seo.ogType || 'website')}" />`,
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${escapeAttribute(seo.ogUrl)}" />${
        seo.ogArticlePublishedTime
          ? `\n    <meta property="article:published_time" content="${escapeAttribute(seo.ogArticlePublishedTime)}" />`
          : ''
      }${
        seo.ogArticleModifiedTime
          ? `\n    <meta property="article:modified_time" content="${escapeAttribute(seo.ogArticleModifiedTime)}" />`
          : ''
      }`,
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeAttribute(seo.ogTitle)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeAttribute(seo.ogDescription)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escapeAttribute(seo.twitterTitle)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapeAttribute(seo.twitterDescription)}" />`,
    )
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">\n${structuredData}\n    </script>`,
    );
};

const routeOutputPath = (routePath) => {
  if (routePath === '/') {
    return clientIndexPath;
  }

  return path.join(root, 'dist', routePath, 'index.html');
};

for (const routePath of getStaticRoutes()) {
  const appHtml = await render(routePath);
  const outputPath = routeOutputPath(routePath);
  const routeHtml = injectHead(
    template.replace('<!--app-html-->', appHtml),
    routePath,
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, routeHtml);
}

const today = new Date().toISOString().slice(0, 10);
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getStaticRoutes()
  .filter((routePath) => !noindexRoutes.includes(routePath))
  .map((routePath) => {
    const loc = `https://maiatesta.com${routePath}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

await fs.writeFile(path.join(root, 'dist', 'sitemap.xml'), sitemapXml);

await fs.rm(serverOutDir, { recursive: true, force: true });
