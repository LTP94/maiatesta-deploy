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
| `public/assets/editorial/*.avif` | Editorial content images | Pexels, optimized locally | target under 120 KB each | Primary format for homepage and guide pacing. |
| `public/assets/editorial/*.webp` | Editorial content image fallback | Pexels, optimized locally | target under 120 KB each | Fallback format for browsers without AVIF. |
| `public/assets/Firma_*.png` | Email signature images | signature source | small | Kept public intentionally for direct links. |

## Editorial Image Source Audit

License reference for all rows: [Pexels License](https://www.pexels.com/license/). Download date: 2026-05-22. All images were converted locally to exact `960x540` AVIF/WebP pairs and rendered only from `/assets/editorial/`.

| Local filename | Source URL | License | Reason selected |
| --- | --- | --- | --- |
| `homepage-services-automation-dashboard.avif/.webp` | `https://www.pexels.com/photo/17279854/` | Pexels free commercial use | Dark technical workstation mood for automation and service operations. |
| `homepage-projects-dark-workstation.avif/.webp` | `https://www.pexels.com/photo/12969403/` | Pexels free commercial use | Dark workstation scene that supports infrastructure, projects, and performance positioning. |
| `guide-chatbot-lead-flow.avif/.webp` | `https://www.pexels.com/photo/30547598/` | Pexels free commercial use | Abstract digital interaction visual for chatbot lead flow without trademarked UI. |
| `guide-web-pyme-local-seo.avif/.webp` | `https://www.pexels.com/photo/6424584/` | Pexels free commercial use | Laptop and website context for small business web presence and local SEO. |
| `guide-inventory-logistics-dashboard.avif/.webp` | `https://www.pexels.com/photo/4483941/` | Pexels free commercial use | Logistics and warehouse context for inventory control topics. |
| `guide-excel-reporting-dashboard.avif/.webp` | `https://www.pexels.com/photo/5466250/` | Pexels free commercial use | Analytics/dashboard context for report automation and operational visibility. |

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
