# SEO Content System For Maiatesta

This is the operating manual for future agents creating SEO content for Maiatesta. Follow it before adding any new article, service page, or local landing page.

## Brand And Strategy Rules

- Use the brand name exactly as `Maiatesta`.
- Write Spanish-first for Quito, Pichincha, and Ecuador.
- Prioritize accessible, practical services for pymes, emprendimientos, profesionales, tiendas, restaurantes, consultorios, academias, and service businesses.
- Keep the core lead path visible: helpful content -> related service page -> WhatsApp CTA.
- Do not publish generic AI filler, fake case studies, fake reviews, fake metrics, or unsupported guarantees.
- Do not keyword-stuff. Use local terms naturally: Quito, Pichincha, Ecuador, pymes, negocios, WhatsApp, inventario, Excel, software, automatización.

## Current SEO Architecture

- Homepage route: `/`.
- Guides index route: `/guias/`.
- Service route family: `/servicios/:slug/`.
- Article route family: `/guias/:slug/`.
- Service content lives in `src/data/servicePages.ts`.
- Article content lives in `src/data/articlePages.ts`.
- Route slugs live in `src/data/serviceRoutes.ts` and `src/data/articleRoutes.ts`.
- SSG route generation lives in `src/entry-server.tsx`.
- Prerendering and per-route metadata injection live in `scripts/prerender.mjs`.
- `dist/sitemap.xml` is generated during build from `getStaticRoutes()`.

## Article Workflow

1. Define the keyword brief:
   - `primaryKeyword`
   - search intent
   - audience
   - related service IDs
   - CTA message
2. Check intent duplication:
   - Do not publish a new article if an existing service or article already satisfies the same search intent.
   - If the intent is commercial, prefer improving a service page.
   - If the intent is educational or price/comparison-based, create an article.
3. Draft the article object:
   - Use `npm run create:article -- --slug "<slug>" --keyword "<keyword>" --intent "<intent>" --related "<service-id,service-id>"`.
   - Paste the generated object into `src/data/articlePages.ts`.
   - Add the slug to `src/data/articleRoutes.ts`.
4. Write the article:
   - Use one H1 only.
   - Use short, direct sections.
   - Include specific Quito/Ecuador context.
   - Include practical price, scope, or decision guidance when honest.
   - Include 3 FAQs phrased as local business owners would ask them.
5. Link it:
   - Link every article to 2-3 related service pages.
   - Keep every article reachable from `/guias/`.
   - Feature only the top 3 guides on the homepage.
   - Add 1-2 contextual guide links on related service pages.
   - Do not add `Blog` to the main header unless Search Console shows guide traffic deserves primary navigation.
   - Keep the WhatsApp CTA specific to the article topic.
6. Validate before shipping:
   - `npm run build`
   - `npm run check:seo`
   - `npm run check:bundle`
   - `npm run check:cls`
   - `npm run check:scroll-load`

## Required Article Fields

Every article in `src/data/articlePages.ts` must include:

- `slug`: URL-safe, lowercase, no accents, no trailing slash.
- `title`: readable editorial title.
- `metaTitle`: unique, under roughly 60 characters when possible.
- `metaDescription`: unique, useful, roughly 90-160 characters.
- `h1`: unique and aligned to the search intent.
- `publishDate`: `YYYY-MM-DD`.
- `updatedDate`: `YYYY-MM-DD`.
- `primaryKeyword`: one primary query only.
- `searchIntent`: concise description of what the searcher wants.
- `excerpt`: direct summary for the hero.
- `sections`: 3 or more useful content sections.
- `faqs`: 3 or more specific questions.
- `relatedServiceIds`: 2-3 valid IDs from `siteContent.products`.
- `ctaMessage`: WhatsApp message tailored to the article.

## Quality Bar

Publish only if the article answers a real buyer question better than a generic agency blog would.

Good Maiatesta article:
- Names Quito/Ecuador context without forcing it.
- Explains price, tradeoffs, scope, or process clearly.
- Helps a business owner decide what to do next.
- Links to the relevant service page.
- Can be quoted by AI search because it gives concise answers.

Bad Maiatesta article:
- Repeats the same keyword in every paragraph.
- Makes unsupported promises like "rank #1 quickly".
- Talks about enterprise solutions instead of accessible pymes.
- Has no local context or next step.
- Exists only to fill a monthly quota.

## Monthly Publishing Rhythm

Target: 4 quality pieces per month.

Recommended order:
1. Price/intention articles.
2. Operational problem articles.
3. Industry-specific use cases.
4. Comparison articles.

Current first targets:
- `cuanto-cuesta-chatbot-whatsapp-ecuador`
- `pagina-web-negocio-pequeno-quito`
- `software-inventario-pymes-quito`
- `automatizar-reportes-excel-pyme`

## Post-Deploy SEO Checklist

- Submit `https://maiatesta.com/sitemap.xml` in Google Search Console.
- Inspect each new `/guias/.../` URL.
- Confirm the page is indexable.
- Track queries weekly:
  - `maiatesta`
  - `maiatesta quito`
  - `chatbot whatsapp ecuador`
  - `desarrollo web quito`
  - `software inventario quito`
  - `automatizar reportes excel pyme`
- Update articles when real client questions reveal better wording.
