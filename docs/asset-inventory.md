# Asset Inventory

Use this inventory whenever adding, replacing, or deleting assets.

## Deployable Assets

| Asset | Purpose | Source | Budget | Notes |
| --- | --- | --- | --- | --- |
| `public/assets/maiatesta-logo.webp` | Header/logo | brand source | small | Preloaded for brand visibility. |
| `public/assets/cosmic/solar-orb-900.avif` | Hero focal object | user-provided Unsplash source | under 80 KB | Decorative orbit image. |
| `public/assets/cosmic/night-horizon-1400.avif` | Integrated chatbot background | user-provided Unsplash source | under 150 KB | Animated behind the bot surface below “Why Maiatesta.” |
| `public/assets/background/cosmic-site-desktop.webm/.mp4` | Shared desktop site background | Vecteezy video `10367035` | about 1.0–1.2 MB | Silent 1280×720, 20 FPS; WebM primary and MP4 fallback. |
| `public/assets/background/cosmic-site-mobile.webm/.mp4` | Shared mobile site background | Vecteezy video `10367035` | under 700 KB each | Portrait crop at 540×960, 20 FPS. |
| `public/assets/background/cosmic-site-*-poster.webp` | Site video fallback and first paint | Vecteezy video `10367035` | under 100 KB each | Responsive poster remains when motion/data settings disable video. |
| `public/assets/intro/why-maiatesta.webm/.mp4` | “Why Maiatesta” portrait introduction | user-provided `video_intro (1).mp4` | under 1.8 MB each | Lazy 540×960, 24 FPS, with audio; WebM primary and MP4 fallback. |
| `public/assets/intro/why-maiatesta-poster.webp` | “Why Maiatesta” reduced-motion and pre-load poster | user-provided `video_intro (1).mp4` | under 30 KB | Visible until the section approaches the viewport. |
| `public/assets/maiatesta-persona-hero.webp` | Legacy/share portrait | optimized portrait | under 100 KB | Retained for social metadata and brand use. |
| `public/assets/previews/*.webp` | Service posters | raw screenshots/videos | under 100 KB each | Posters must appear before video. |
| `public/assets/previews/videos/*.webm` | Service video previews | `assets-source/videos-raw` | target under 800 KB | Primary preview format. |
| `public/assets/previews/videos/*.mp4` | Service video fallback | `assets-source/videos-raw` | target under 1.2 MB | Fallback for compatibility. |
| `public/assets/editorial/*.avif` | Editorial content images | Pexels, optimized locally | target under 120 KB each | Primary format for homepage and guide pacing. |
| `public/assets/editorial/*.webp` | Editorial content image fallback | Pexels, optimized locally | target under 120 KB each | Fallback format for browsers without AVIF. |
| `public/assets/Firma_*.png` | Email signature images | signature source | small | Kept public intentionally for direct links. |
| `public/assets/case-studies/*.mp4` | Real client video testimonials (click-to-play) | client-provided raw footage, trimmed | target under 2 MB each | Click-to-play only, no autoplay — byte cost is opt-in. See `CASE_STUDY_APPROVALS.md` in the same folder for consent records. |
| `public/assets/case-studies/*.webm` | Real client video testimonials, WebM primary | client-provided raw footage, trimmed | target under 2 MB each | Same click-to-play behavior as the MP4 fallback. |
| `public/assets/case-studies/*-poster.webp` | Case study video posters | extracted frame from trimmed clip | under 30 KB each | Loads immediately; video only loads after a visitor clicks play. |

## Editorial Image Source Audit

License reference for all rows: [Pexels License](https://www.pexels.com/license/). Download date: 2026-05-22. All images were converted locally to exact `960x540` AVIF/WebP pairs and rendered only from `/assets/editorial/`.

| Local filename | Source URL | License | Reason selected |
| --- | --- | --- | --- |
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
| `photo-1572191783453-62f99a6055ce.avif` | `assets-source/videos-raw/` | retired; no deployable output | Original hero background source retained locally after the Vecteezy replacement. |
| `photo-1645235142939-096560a17aab.avif` | `assets-source/videos-raw/` | `cosmic/solar-orb-900.avif` | user-provided Unsplash source |
| `photo-1466853817435-05b43fe45b39.avif` | `assets-source/videos-raw/` | `cosmic/night-horizon-1400.avif` | user-provided Unsplash source |
| `vecteezy_awesome-night-sky-time-lapse-with-milky-way-galaxy_10367035.mp4` | `assets-source/videos-raw/` | `background/cosmic-site-*` | User-provided Vecteezy master; footer attribution included for Free License compliance. |
| `video_intro (1).mp4` | `assets-source/videos-raw/` | `intro/why-maiatesta.webm/.mp4` and poster | User-provided 59 MB portrait master; optimized deploy variants contain audio. |
| `WhatsApp Video 2026-07-26 at 11.18.02.mp4` | `assets-source/videos-raw/` | `case-studies/la-pulga-picosa-inventario-1.webm/.mp4` and poster | Client-provided (La Pulga Picosa) real testimonial; trimmed 15s–29s from a 39.6s personal reel — unrelated segments (product modeling) excluded. See `CASE_STUDY_APPROVALS.md`. |
| `IMG_1996.MOV` | `assets-source/videos-raw/` | `case-studies/la-pulga-picosa-inventario-2.webm/.mp4` and poster | Client-provided (La Pulga Picosa) real testimonial; trimmed 29s–39s from a 50.2s personal reel — a segment showing real business data (internal spreadsheet) was deliberately excluded. See `CASE_STUDY_APPROVALS.md`. |

## External Storage Decision

Default: keep raw files local and ignored.

If another collaborator needs raw assets, choose one:

- Git LFS for versioned media.
- Google Drive/Dropbox for simple handoff.
- Cloudflare R2/S3 for durable asset storage.

Record the chosen external source here once decided.
