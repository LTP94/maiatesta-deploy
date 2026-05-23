# Data Schema Guide

This document explains how to add, edit or remove content from the three main data layers.

## File Map

```
src/data/
├── siteContent.ts          ← assembler (import/re-export only)
├── content/
│   ├── types.ts            ← TypeScript interfaces
│   ├── brand.ts            ← brand name, logo, languageSwitcher labels
│   ├── en.ts               ← full English locale
│   └── es.ts               ← full Spanish locale
├── servicePages.ts         ← assembler (import/re-export only)
├── serviceRoutes.ts        ← ServiceRouteSlug union + normalizeServicePath()
├── services/
│   ├── index.ts            ← re-exports all service pages as allServicePages[]
│   ├── desarrollo-web.ts
│   ├── chatbots-whatsapp.ts
│   ├── software-inventario.ts
│   ├── software-a-medida.ts
│   ├── tiendas-online.ts
│   ├── automatizacion-excel.ts
│   └── control-compras.ts
├── articlePages.ts         ← assembler (import/re-export only)
├── articleRoutes.ts        ← ArticleRouteSlug union + normalizeArticlePath()
└── articles/
    ├── index.ts            ← re-exports all articles as allArticlePages[]
    ├── chatbot-cost.ts
    ├── web-small-business.ts
    ├── inventory-software.ts
    └── excel-reports.ts
```

---

## How to Add a Service Page

1. **Create** `src/data/services/my-new-service.ts`:
   ```ts
   import type { ServicePage } from '../servicePages';

   export const myNewService: ServicePage = {
     slug: 'my-new-service-quito' as const,
     productId: 'my-product-id',
     // ... fill all required fields
   };
   ```

2. **Add the slug** to `src/data/serviceRoutes.ts`:
   ```ts
   export type ServiceRouteSlug =
     | 'desarrollo-web-quito'
     | /* ... existing slugs ... */
     | 'my-new-service-quito';
   ```

3. **Register** in `src/data/services/index.ts`:
   ```ts
   import { myNewService } from './my-new-service';
   export const allServicePages = [/* existing... */, myNewService];
   ```

4. **Add the product** to both `src/data/content/en.ts` and `src/data/content/es.ts` under `locales.products`.

5. Run `npx tsc --noEmit` to verify — the `satisfies` check in `servicePages.ts` will catch any missing fields.

---

## How to Add an Article / Guide

1. **Create** `src/data/articles/my-new-article.ts`:
   ```ts
   import type { ArticlePage } from '../articlePages';

   export const myNewArticle: ArticlePage = {
     slug: 'my-article-slug-quito' as const,
     // ... fill all required fields
   };
   ```

2. **Add the slug** to `src/data/articleRoutes.ts`:
   ```ts
   export type ArticleRouteSlug =
     | /* existing slugs */
     | 'my-article-slug-quito';
   ```

3. **Register** in `src/data/articles/index.ts`.

4. **Add the editorial image** mapping in `src/components/ArticleLandingPage.tsx` (the `articleEditorialImages` object near the top).

5. **Add the route** to `scripts/prerender.mjs` so SSG generates a static HTML file.

---

## How to Edit Site Text (Locales)

All UI strings live in `src/data/content/en.ts` and `src/data/content/es.ts`.

The `LocalizedContent` interface in `src/data/content/types.ts` documents every field. TypeScript will error if a field is missing or has the wrong type.

**Common edits:**

| What to change | Where |
|---|---|
| Hero headline / body | `hero.headline` / `hero.body` |
| Navigation links | `nav[]` array |
| FAQ items | `faqs.items[]` array |
| WhatsApp number / message | `contact.channels[]` |
| Footer links | `footer.nav[]` |
| Product descriptions | `products[]` |

---

## Slug Naming Convention

Slugs must be **lowercase kebab-case** and include a geo-qualifier (`-quito`, `-ecuador`) for local SEO.

Always append `as const` to the slug string literal in the individual data file so TypeScript narrows the type from `string` to the specific literal:

```ts
slug: 'desarrollo-web-quito' as const,
//                            ^^^^^^^^ required!
```
