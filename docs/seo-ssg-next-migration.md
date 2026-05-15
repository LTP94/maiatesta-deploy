# SEO Rendering Migration Blueprint

## Decision

The current site is a Vite React app. It was CSR because `index.html` shipped an empty `#root` and `src/main.tsx` used `createRoot`. The fastest cash-flow-oriented fix is now implemented: Vite SSG prerenders `dist/index.html`, then React hydrates it.

Use this order:

1. Keep the new Vite SSG build for the immediate deploy.
2. Migrate to Next.js App Router when you add real local landing pages.
3. Avoid bot-only edge rendering as the primary solution. It adds cost, complexity, and cloaking risk if crawler HTML differs from user HTML.

## Current Vite SSG Boilerplate

`src/entry-client.tsx`

```tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './deferred.css';

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/entry-server.tsx`

```tsx
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
// @ts-expect-error Node types are intentionally not installed for this tiny SSG entry.
import { PassThrough } from 'node:stream';
import App from './App';

export function render() {
  return new Promise<string>((resolve, reject) => {
    let html = '';
    const stream = new PassThrough();

    stream.on('data', (chunk: { toString(): string }) => {
      html += chunk.toString();
    });
    stream.on('end', () => resolve(html));
    stream.on('error', reject);

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <App />
      </StrictMode>,
      {
        onAllReady() {
          pipe(stream);
        },
        onError(error) {
          reject(error);
        },
      },
    );
  });
}
```

`scripts/prerender.mjs`

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientIndexPath = path.join(root, 'dist', 'index.html');
const serverEntryPath = path.join(root, 'dist', 'server', 'entry-server.js');

const template = await fs.readFile(clientIndexPath, 'utf8');
const { render } = await import(`file://${serverEntryPath}`);
const appHtml = await render();

await fs.writeFile(
  clientIndexPath,
  template.replace('<!--app-html-->', appHtml),
);
```

`package.json`

```json
{
  "scripts": {
    "build": "tsc && vite build && vite build --ssr src/entry-server.tsx --outDir dist/server && node scripts/prerender.mjs"
  }
}
```

## Next.js App Router Boilerplate

Use this when creating `/desarrollo-web-quito`, `/chatbots-ia-ecuador`, `/software-pymes-quito`, and `/automatizacion-excel-quito`.

`next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
```

`app/seo.ts`

```ts
import type { Metadata } from 'next';

const siteUrl = 'https://maiatesta.com';

export const pageSeo = {
  home: {
    slug: '/',
    title: 'Desarrollo de Software Accesible en Quito | MaiAtesta',
    description:
      'Páginas web, chatbots con IA, software para pymes, inventario y automatización de Excel para negocios en Quito, Pichincha y Ecuador.',
  },
  chatbots: {
    slug: '/chatbots-ia-ecuador',
    title: 'Chatbots con IA para Empresas Ecuador | MaiAtesta',
    description:
      'Chatbots de WhatsApp con IA para responder preguntas, capturar leads y filtrar clientes para empresas y pymes en Ecuador.',
  },
  software: {
    slug: '/software-pymes-quito',
    title: 'Software para Pymes en Quito | MaiAtesta',
    description:
      'Desarrollo de software accesible en Quito para inventario, reportes, reservas, dashboards y procesos internos de pymes.',
  },
} as const;

export function buildMetadata(page: keyof typeof pageSeo): Metadata {
  const seo = pageSeo[page];
  const url = new URL(seo.slug, siteUrl);

  return {
    metadataBase: new URL(siteUrl),
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url.pathname },
    openGraph: {
      type: 'website',
      locale: 'es_EC',
      url,
      siteName: 'MaiAtesta',
      title: seo.title,
      description: seo.description,
      images: [{ url: '/assets/maiatesta-persona-hero.webp', width: 720, height: 720 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/assets/maiatesta-persona-hero.webp'],
    },
    robots: { index: true, follow: true },
  };
}
```

`app/schema.tsx`

```tsx
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LocalBusiness', 'ProfessionalService'],
      '@id': 'https://maiatesta.com/#localbusiness',
      name: 'MaiAtesta',
      url: 'https://maiatesta.com/',
      image: 'https://maiatesta.com/assets/maiatesta-persona-hero.webp',
      logo: 'https://maiatesta.com/assets/maiatesta-logo-optimized-2.jpg',
      description:
        'Agencia digital accesible en Quito para desarrollo web, chatbots con IA, software para pymes, inventario y automatización de Excel.',
      telephone: '+593963092859',
      email: 'maiatesta@gmail.com',
      priceRange: '$60-$200+',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Quito',
        addressRegion: 'Pichincha',
        addressCountry: 'EC',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: -0.1807,
        longitude: -78.4678,
      },
      areaServed: [
        { '@type': 'City', name: 'Quito' },
        { '@type': 'AdministrativeArea', name: 'Pichincha' },
        { '@type': 'Country', name: 'Ecuador' },
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Servicios digitales accesibles en Quito',
        itemListElement: [
          {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '60',
            itemOffered: {
              '@type': ['Service', 'SoftwareApplication'],
              name: 'Chatbot de WhatsApp con IA',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, WhatsApp',
              description:
                'Chatbots con IA para empresas Ecuador: respuestas frecuentes, captura de leads, filtros comerciales y alertas al celular.',
              areaServed: { '@type': 'Country', name: 'Ecuador' },
            },
          },
          {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '200',
            itemOffered: {
              '@type': 'Service',
              name: 'Desarrollo web accesible en Quito',
              description:
                'Páginas web y landing pages para pymes, profesionales y negocios locales en Quito.',
              areaServed: { '@type': 'City', name: 'Quito' },
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': ['Service', 'SoftwareApplication'],
              name: 'Software para pymes e inventario',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description:
                'Sistemas para inventario, reportes, usuarios, trazabilidad, dashboards y control operativo.',
              areaServed: { '@type': 'AdministrativeArea', name: 'Pichincha' },
            },
          },
        ],
      },
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(localBusinessSchema).replace(/</g, '\\u003c'),
      }}
    />
  );
}
```

`app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { JsonLd } from './schema';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://maiatesta.com'),
  title: {
    default: 'Desarrollo de Software Accesible en Quito | MaiAtesta',
    template: '%s | MaiAtesta',
  },
  description:
    'Páginas web, chatbots con IA, software para pymes, inventario y automatización de Excel para negocios en Quito, Pichincha y Ecuador.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-EC">
      <body>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
```

`app/page.tsx`

```tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import { buildMetadata } from './seo';
import ChatbotIsland from './ui/ChatbotIsland';

export const metadata: Metadata = buildMetadata('home');

export default function HomePage() {
  return (
    <main>
      <section aria-labelledby="hero-title">
        <header>
          <p>Agencia digital accesible en Quito, Pichincha</p>
          <h1 id="hero-title">Desarrollo de software accesible en Quito</h1>
          <p>
            Páginas web, chatbots con IA, tiendas online, inventario y
            automatización para pymes y negocios en Ecuador.
          </p>
        </header>
        <Image
          src="/assets/maiatesta-persona-hero.webp"
          alt="MaiAtesta desarrollo web y chatbots con IA para pymes en Quito"
          width={720}
          height={720}
          priority
        />
      </section>
      <ChatbotIsland />
    </main>
  );
}
```

`app/ui/ChatbotIsland.tsx`

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const TypebotWidget = dynamic(() => import('./TypebotWidget'), {
  ssr: false,
  loading: () => null,
});

export default function ChatbotIsland() {
  const [open, setOpen] = useState(false);

  return open ? (
    <TypebotWidget />
  ) : (
    <button type="button" onClick={() => setOpen(true)}>
      Abrir chat de WhatsApp con IA
    </button>
  );
}
```

## Semantic HTML Rules

Use one visible `<h1>` per route, inside a page `<main>`. Each local-intent block should be a `<section aria-labelledby>`, with an internal `<header>`, then answer text in plain `<p>` tags. Package cards and FAQs should be `<article>` elements.

Recommended FAQ blocks:

```tsx
<section aria-labelledby="faq-chatbot-cost">
  <header>
    <h2 id="faq-chatbot-cost">¿Cuánto cuesta un chatbot en Ecuador?</h2>
  </header>
  <p>
    Un chatbot básico para WhatsApp empieza desde US$60. El precio sube si
    necesita CRM, base de datos, integraciones o flujos avanzados.
  </p>
</section>
```

## Performance Rules

1. Keep the chatbot script behind user intent. Never load Typebot or external widget libraries during first paint.
2. Do not hydrate decorative backgrounds if CSS can do the job.
3. Use `picture` now, or `next/image` after migration, for WebP/AVIF.
4. Keep the first route under 150 KB JavaScript after gzip when possible.
5. Avoid `setInterval` animations for critical UI on mobile; CSS transforms are safer for INP.
6. Do not embed external iframes in above-the-fold cards on mobile.
