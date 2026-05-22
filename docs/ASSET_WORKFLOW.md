# Asset Workflow

## Principle

Only optimized deployable assets belong in `public/assets`.

Raw media belongs in `assets-source` locally or in external storage. The repo should not depend on raw files being public.

## Folder Policy

```txt
assets-source/
  videos-raw/
  images-raw/
public/assets/
  brand/
  previews/
  previews/videos/
```

Current raw video masters have been moved to:

```txt
assets-source/videos-raw/
```

This folder is ignored by git by default. If raw files must be versioned, use Git LFS or external storage and document the source link in `docs/asset-inventory.md`.

## Video Rules

For service previews:

- output WebM + MP4 fallback
- 4-6 second loop
- no audio
- 24 FPS
- max width around 640px
- target under 800 KB, hard cap around 1.2 MB
- use poster WebP
- never render raw `.mov` in HTML

## Image Rules

- Use WebP/AVIF when possible.
- Use explicit dimensions or stable CSS aspect ratios.
- Preload only true above-the-fold images.
- Avoid high-priority decorative images.

## Adding A New Asset

1. Put the raw file in `assets-source`.
2. Generate optimized output into `public/assets`.
3. Add/update the asset in `docs/asset-inventory.md`.
4. Reference the optimized file in code/data.
5. Run:

```bash
npm run build
npm run check:bundle
npm run check:scroll-load
npm run check:scroll-performance
```

## Asset Hygiene Check

```bash
find dist -maxdepth 4 -type f \( -name '*.mov' -o -name '.DS_Store' \) -print
```

Expected result: no output.
