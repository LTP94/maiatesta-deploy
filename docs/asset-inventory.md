# Asset Inventory

Use this inventory whenever adding, replacing, or deleting assets.

## Deployable Assets

| Asset | Purpose | Source | Budget | Notes |
| --- | --- | --- | --- | --- |
| `public/assets/maiatesta-logo.webp` | Header/logo | brand source | small | Preloaded for brand visibility. |
| `public/assets/maiatesta-persona-hero.webp` | Hero image | optimized portrait | under 100 KB | Above-the-fold image. |
| `public/assets/previews/*.webp` | Service posters | raw screenshots/videos | under 100 KB each | Posters must appear before video. |
| `public/assets/previews/videos/*.webm` | Service video previews | `assets-source/videos-raw` | target under 800 KB | Primary preview format. |
| `public/assets/previews/videos/*.mp4` | Service video fallback | `assets-source/videos-raw` | target under 1.2 MB | Fallback for compatibility. |
| `public/assets/Firma_*.png` | Email signature images | signature source | small | Kept public intentionally for direct links. |

## Raw Local Assets

| Raw File | Current Location | Optimized Output | Status |
| --- | --- | --- | --- |
| `web_development.mov` | `assets-source/videos-raw/` | `web-development-preview.webm/mp4` | local raw, ignored |
| `ecommerce.mov` | `assets-source/videos-raw/` | `ecommerce-preview.webm/mp4` | local raw, ignored |
| `inventario.mov` | `assets-source/videos-raw/` | `inventory-preview.webm/mp4` | local raw, ignored |
| `legalis.mov` | `assets-source/videos-raw/` | `custom-software-preview.webm/mp4` | local raw, ignored |
| `Dashboard.mov` | `assets-source/videos-raw/` | `spreadsheet-automation-preview.webm/mp4` | local raw, ignored |

## External Storage Decision

Default: keep raw files local and ignored.

If another collaborator needs raw assets, choose one:

- Git LFS for versioned media.
- Google Drive/Dropbox for simple handoff.
- Cloudflare R2/S3 for durable asset storage.

Record the chosen external source here once decided.
