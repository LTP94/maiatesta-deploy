# SOP: Optimize A New Video Preview

1. Put the raw video in `assets-source/videos-raw/`.
2. Export a short silent loop:
   - 4-6 seconds
   - 24 FPS
   - max width around 640px
   - WebM primary
   - MP4 fallback
   - WebP poster
3. Save optimized outputs in `public/assets/previews/videos/`.
4. Update `docs/asset-inventory.md`.
5. Reference only optimized outputs in data/components.
6. Run:

```bash
npm run build
npm run check:scroll-load
npm run check:scroll-performance
```

7. Confirm no `.mov` appears in `dist`.
