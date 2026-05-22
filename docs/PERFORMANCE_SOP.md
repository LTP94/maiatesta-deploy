# Performance SOP

## Goal

Maiatesta must feel fast on mobile 4G in Quito. Performance is a conversion requirement, not decoration.

## Budgets

- Main app bundle: under `50 KiB`.
- CLS: under `0.1`; target near `0`.
- Raw `.mov` in production: `0`.
- Mobile scroll long tasks in the performance guard: under `200ms`.
- Typebot: click-only.

## Required Checks

```bash
npm run build
npm run check:bundle
npm run check:cls
npm run check:scroll-load
npm run check:scroll-performance
```

## Common Causes Of Regressions

- Moving critical layout CSS into deferred CSS.
- Adding raw images/videos to `public/assets`.
- Loading Typebot, analytics, or widgets before user intent.
- Adding continuous mobile animations.
- Rendering heavy below-fold components in the initial bundle.
- Hydrating different markup than the SSG output.

## Rules For New UI

- Keep hero and SEO content immediately visible.
- Lazy-load below-fold sections.
- Avoid loaders that hide content.
- Prefer static previews over iframes.
- Use videos only when active/in view/intent-driven.
- Respect `prefers-reduced-motion`.
- Test at mobile widths `390px` and `430px`.

## If Production Feels Slow

1. Confirm Vercel deployed the latest build.
2. Run the full performance checklist locally.
3. Check `dist` size and raw assets.
4. Inspect console for hydration errors.
5. Temporarily disable decorative motion to isolate GPU cost.
6. Log the issue in `docs/INCIDENTS.md`.
