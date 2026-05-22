# Maiatesta Architecture

## Stack

- Vite 5
- React 18
- TypeScript
- Static Site Generation through a temporary SSR build
- Vercel static deployment

## Rendering Model

`npm run build` runs:

1. `tsc`
2. Vite client build into `dist`
3. Vite SSR build into `.ssg-server`
4. `scripts/prerender.mjs`
5. `.ssg-server` cleanup

The production output is static HTML in `dist`. Search engines should receive complete HTML before hydration.

## Routing

- `/`: homepage
- `/servicios/:slug/`: service landing pages
- `/guias/`: guides index
- `/guias/:slug/`: SEO guide pages
- `/firmas/`: utility signature page

Routes are generated from `getStaticRoutes()` in `src/entry-server.tsx`.

## SEO System

Route metadata and structured data are generated in `src/entry-server.tsx` and injected by `scripts/prerender.mjs`.

Every indexable page must have:

- unique title
- unique meta description
- canonical URL
- one H1
- JSON-LD
- sitemap entry
- no `meta keywords`
- no accidental `noindex`

## CSS Strategy

- `src/critical.css`: inlined in the HTML head to prevent FOUC.
- `src/deferred.css`: loaded with preload + non-blocking stylesheet.

Do not move above-the-fold layout styles out of `critical.css`.

## Performance Strategy

- Hero and SEO HTML should be visible immediately.
- Below-fold components are lazy-loaded.
- Typebot is click-only.
- Raw `.mov` files must never ship in `dist`.
- Main app bundle should stay under `50 KiB`.

## Important Scripts

- `scripts/prerender.mjs`: SSG generation and sitemap output.
- `scripts/check-bundle-size.mjs`: main bundle budget.
- `scripts/check-seo-pages.mjs`: metadata/schema/indexability.
- `scripts/check-cls.mjs`: layout shift.
- `scripts/check-scroll-load.mjs`: raw/blank below-fold guard.
- `scripts/check-scroll-performance.mjs`: scroll jank guard.
- `scripts/create-seo-article.mjs`: SEO article draft helper.
