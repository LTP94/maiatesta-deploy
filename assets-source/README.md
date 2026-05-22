# Source Assets

This folder is for raw working assets that should not be deployed directly.

## Rules

- Keep optimized production assets in `public/assets`.
- Keep raw videos in `assets-source/videos-raw`.
- Raw `.mov` files are ignored by git by default.
- If raw files need to be shared with collaborators, use Git LFS or external storage and document the link in `docs/asset-inventory.md`.
- Never reference files from this folder in React components, CSS, HTML, or metadata.

## Current Raw Video Masters

The local raw masters used to generate service preview videos are expected here:

- `web_development.mov`
- `ecommerce.mov`
- `inventario.mov`
- `legalis.mov`
- `Dashboard.mov`
