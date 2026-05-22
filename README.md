# Maiatesta Agency Site

A modern React website for Maiatesta, an agency selling websites, bots, automations, and custom development.

## Start Here

Read [docs/START_HERE.md](docs/START_HERE.md) before changing the project. It explains the architecture, deploy flow, asset rules, SEO workflow, and current operating standards.

## Quick Start

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` type-checks, builds the client, builds temporary SSR output, prerenders static pages, and removes `.ssg-server`.
- `npm run preview` previews the production build.
- `npm run check:bundle` verifies the main JS bundle stays under budget.
- `npm run check:seo` verifies metadata, canonical tags, schema, and sitemap URLs.
- `npm run check:cls` checks layout shift.
- `npm run check:scroll-load` checks below-fold loading.
- `npm run check:scroll-performance` checks scroll jank under throttled profiles.
- `npm run perf:test` runs the production performance gate.

## Project Map

- `src/App.tsx`: route shell, lazy loading, homepage composition.
- `src/entry-server.tsx`: SSG route list, SEO metadata, JSON-LD schema.
- `scripts/prerender.mjs`: turns the Vite build into static HTML pages.
- `src/data/siteContent.ts`: homepage/service copy.
- `src/data/servicePages.ts`: service landing pages.
- `src/data/articlePages.ts`: SEO guide pages.
- `src/critical.css`: above-the-fold and no-FOUC baseline CSS.
- `src/deferred.css`: below-fold and richer visual styling.
- `public/assets`: deployable optimized assets only.
- `assets-source`: local/raw source assets, ignored by git unless intentionally managed with LFS or external storage.

## Required Before Deploy

```bash
npm run build
npm run check:bundle
npm run check:seo
npm run check:cls
npm run check:scroll-load
npm run check:scroll-performance
```

For deeper operating docs, see:

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Asset Workflow](docs/ASSET_WORKFLOW.md)
- [Performance SOP](docs/PERFORMANCE_SOP.md)
- [SEO Content System](docs/SEO_CONTENT_SYSTEM.md)
