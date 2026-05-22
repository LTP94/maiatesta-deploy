# SOP: Publish A New SEO Guide

1. Define keyword, search intent, audience, related services, and CTA.
2. Check `src/data/articlePages.ts` for duplicate intent.
3. Generate a draft:

```bash
npm run create:article -- --slug "<slug>" --keyword "<keyword>" --intent "<intent>" --related "<service-id,service-id>"
```

4. Add the article object to `src/data/articlePages.ts`.
5. Add the slug to `src/data/articleRoutes.ts`.
6. Link to 2-3 related service pages.
7. Confirm it appears in `/guias/`.
8. Run:

```bash
npm run build
npm run check:seo
```

9. After deploy, inspect the URL in Google Search Console.
