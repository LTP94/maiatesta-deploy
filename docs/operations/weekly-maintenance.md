# SOP: Weekly Maintenance

Run this once per week.

1. Check Google Search Console:
   - brand searches
   - service queries
   - guide impressions
   - indexing issues
2. Check Vercel:
   - latest deployment status
   - build failures
   - stale production symptoms
3. Check performance:

```bash
npm run build
npm run check:bundle
npm run check:seo
npm run check:scroll-performance
```

4. Review WhatsApp lead quality.
5. Update `docs/CONTENT_CALENDAR.md`.
6. Log important changes in `docs/CHANGELOG_INTERNAL.md`.
