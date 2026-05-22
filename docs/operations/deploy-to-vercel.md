# SOP: Deploy To Vercel

1. Confirm the working tree only contains intentional changes.
2. Run:

```bash
npm run build
npm run check:bundle
npm run check:seo
npm run check:cls
npm run check:scroll-load
npm run check:scroll-performance
```

3. Confirm no raw build artifacts:

```bash
find dist -maxdepth 4 -type f \( -name '*.mov' -o -name '.DS_Store' \) -print
```

4. Commit with a clear message.
5. Push to the Vercel-connected branch.
6. Verify production:
   - homepage loads styled
   - direct service URLs load
   - direct guide URLs load
   - WhatsApp links work
   - `/sitemap.xml` exists
