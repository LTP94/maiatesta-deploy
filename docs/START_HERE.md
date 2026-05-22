# Start Here: Maiatesta Operations

This file is the first stop for any collaborator joining Maiatesta.

## What This Project Is

Maiatesta is a Spanish-first, Quito-focused agency website for accessible web development, software for pymes, WhatsApp chatbots, inventory tools, e-commerce, and Excel automation.

Primary business goal: generate consistent lead volume through local SEO, fast mobile performance, and WhatsApp conversion.

## How The Site Works

- Vite + React renders the app.
- Static Site Generation is handled by `npm run build`.
- `src/entry-server.tsx` defines routes, metadata, sitemap inputs, and JSON-LD schema.
- `scripts/prerender.mjs` injects route HTML, metadata, schema, and sitemap into `dist`.
- Homepage copy lives mostly in `src/data/siteContent.ts`.
- Service pages live in `src/data/servicePages.ts`.
- SEO guide pages live in `src/data/articlePages.ts`.
- `public/assets` contains optimized deployable files only.
- Raw media belongs in `assets-source` or external storage, not in `public/assets`.

## Daily Commands

```bash
npm run dev
npm run build
npm run check:bundle
npm run check:seo
npm run check:cls
npm run check:scroll-load
npm run check:scroll-performance
```

## Golden Rules

- Use the brand spelling `Maiatesta`.
- Keep the Spanish/Quito/Pichincha strategy first.
- Keep WhatsApp as the primary conversion path.
- Do not add heavy scripts, raw videos, unoptimized images, or decorative loaders.
- Do not publish generic SEO filler or fake proof.
- Keep SSG, metadata, JSON-LD, and sitemap working before deploy.
- If performance gets worse, fix it before adding more content or effects.

## Where To Go Next

- Architecture: `docs/ARCHITECTURE.md`
- Deployment: `docs/DEPLOYMENT.md`
- Assets: `docs/ASSET_WORKFLOW.md`
- Performance: `docs/PERFORMANCE_SOP.md`
- SEO content: `docs/SEO_CONTENT_SYSTEM.md`
- Current business/content rhythm: `docs/CONTENT_CALENDAR.md`
- Production incidents: `docs/INCIDENTS.md`
