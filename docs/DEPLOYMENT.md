# Deployment SOP

## Platform

Production is deployed on Vercel from the static `dist` output.

## Pre-Deploy Checklist

Run all checks locally:

```bash
npm run build
npm run check:bundle
npm run check:seo
npm run check:cls
npm run check:scroll-load
npm run check:scroll-performance
```

Confirm build hygiene:

```bash
find dist -maxdepth 4 -type f \( -name '*.mov' -o -name '.DS_Store' \) -print
```

Expected result: no output.

## Deploy Flow

1. Confirm working tree changes are intentional.
2. Run the pre-deploy checklist.
3. Commit with a clear message.
4. Push to the branch connected to Vercel.
5. Wait for Vercel deployment to complete.
6. Open production and verify:
   - homepage loads styled immediately
   - services section scrolls smoothly on mobile
   - WhatsApp button works
   - `/sitemap.xml` exists
   - `/servicios/.../` and `/guias/.../` routes load directly

## Rollback Flow

1. In Vercel, redeploy the last known good deployment.
2. Log the incident in `docs/INCIDENTS.md`.
3. Reproduce locally.
4. Fix with a small patch.
5. Run the full checklist again before redeploying.

## Production Cache Rules

- `/assets/*`: long-lived immutable cache.
- HTML routes: `max-age=0, must-revalidate`.
- Clean service and guide URLs receive the same security headers as the homepage.

## Never Deploy

- raw `.mov` files
- `.DS_Store`
- `.ssg-server`
- broken sitemap
- pages without metadata/schema
- changes that break mobile scroll checks
