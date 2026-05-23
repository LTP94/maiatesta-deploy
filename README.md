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

```
src/
├── App.tsx                  ← route shell + homepage composition (~325 lines)
├── entry-server.tsx         ← SSG route list, SEO metadata, JSON-LD schema
├── critical.css             ← @import assembler → src/styles/critical/
├── deferred.css             ← @import assembler → src/styles/deferred/
├── components/
│   ├── Shells.tsx           ← hydration-shell + fallback components
│   └── *.tsx                ← all other React components (JSDoc on every export)
├── hooks/
│   ├── useScrollActivity.ts ← scroll state + emitScrollActivity
│   ├── useSectionHydration.ts ← IntersectionObserver-based lazy hydration
│   ├── useScrollConstellation.ts ← media-query gate for constellation
│   ├── usePaletteSync.ts    ← localStorage palette persistence + PaletteName type
│   ├── useHashNavigation.ts ← scroll-to-hash on language change
│   ├── useScrolled.ts       ← `is-scrolled` class gate
│   └── useScrollReveal.ts   ← .scroll-reveal IntersectionObserver
├── data/
│   ├── siteContent.ts       ← assembler (re-exports types, brand, en, es)
│   ├── content/             ← types.ts, brand.ts, en.ts, es.ts
│   ├── servicePages.ts      ← assembler (re-exports services/index.ts)
│   ├── services/            ← one file per service page + index.ts
│   ├── articlePages.ts      ← assembler (re-exports articles/index.ts)
│   └── articles/            ← one file per article + index.ts
└── styles/
    ├── critical/            ← variables.css, reset.css, hero.css, persona.css, sections.css
    └── deferred/            ← variables.css, hero-effects.css, header.css, persona.css,
                                sections.css, carousel.css, cards.css, contact-footer.css,
                                animations.css, components.css
scripts/
└── prerender.mjs            ← turns Vite build into static HTML pages
docs/
├── ARCHITECTURE.md          ← technical design decisions
├── CSS_TOKENS.md            ← CSS custom property reference
├── DATA_SCHEMA.md           ← how to add services/articles/copy
└── SEO_CONTENT_SYSTEM.md    ← SEO workflow and content rules
```

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
