import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import App from './App';
import { articlePages, getArticlePageByPath } from './data/articlePages';
import { articleRouteSlugs } from './data/articleRoutes';
import { getLegalPageByPath } from './data/legalPages';
import { legalRouteSlugs } from './data/legalRoutes';
import { getPillarPageByPath } from './data/pillarPages';
import { pillarRouteSlugs } from './data/pillarRoutes';
import { servicePages, getServicePageByPath } from './data/servicePages';
import { serviceRouteSlugs } from './data/serviceRoutes';

const siteUrl = 'https://maiatesta.com';

const localBusinessSchema = {
  '@type': ['LocalBusiness', 'ProfessionalService', 'Organization'],
  '@id': `${siteUrl}/#localbusiness`,
  name: 'Maiatesta',
  alternateName: [
    'Maiatesta Quito',
    'Maiatesta Ecuador',
    'Maiatesta software',
    'Maiatesta agencia digital',
  ],
  url: `${siteUrl}/`,
  image: `${siteUrl}/assets/maiatesta-persona-hero.webp`,
  logo: `${siteUrl}/assets/maiatesta-logo.webp`,
  description:
    'Maiatesta es una agencia digital accesible en Quito para desarrollo web, tiendas online, chatbots de WhatsApp, software para pymes, inventario y automatización de Excel. Ha trabajado con empresas en Ecuador como Largenergy, Estudio 10, La Pulga Picosa y Galapagos Center.',
  email: 'maiatesta@gmail.com',
  telephone: '+593963092859',
  priceRange: '$60-$200+',
  knowsAbout: [
    'desarrollo web',
    'software para pymes',
    'chatbots de WhatsApp',
    'automatización con IA',
    'tiendas online',
    'inventario',
  ],
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
    { '@type': 'Place', name: 'Quito Norte' },
    { '@type': 'Place', name: 'Centro de Quito' },
    { '@type': 'Place', name: 'Sur de Quito' },
    { '@type': 'Place', name: 'Cumbayá' },
    { '@type': 'Place', name: 'Tumbaco' },
  ],
  sameAs: ['https://www.instagram.com/maiatestatech'],
};

const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: 'Maiatesta',
  description:
    'Maiatesta ofrece desarrollo web, chatbots de WhatsApp, tiendas online, inventario y automatización para pymes en Quito, Ecuador.',
  publisher: { '@id': `${siteUrl}/#localbusiness` },
  inLanguage: 'es',
};

function normalizeRoutePath(routePath = '/') {
  if (routePath === '/') {
    return '/';
  }

  return routePath.endsWith('/') ? routePath : `${routePath}/`;
}

// Routes that exist publicly but must never be indexed or listed in the
// sitemap (Meta Embedded Signup entry + OAuth technical return URI).
export const noindexRoutes = ['/whatsapp/connect/', '/whatsapp/connect/callback/'];

export function getStaticRoutes() {
  return [
    '/',
    '/guias/',
    ...serviceRouteSlugs.map((slug) => `/servicios/${slug}/`),
    ...articleRouteSlugs.map((slug) => `/guias/${slug}/`),
    ...pillarRouteSlugs.map((slug) => `/${slug}/`),
    ...legalRouteSlugs.map((slug) => `/${slug}/`),
    ...noindexRoutes,
  ];
}

export function getRouteSeo(routePath = '/') {
  const normalizedPath = normalizeRoutePath(routePath);
  const articlePage = getArticlePageByPath(normalizedPath);
  const servicePage = getServicePageByPath(normalizedPath);
  const pillarPage = getPillarPageByPath(normalizedPath);
  const legalPage = getLegalPageByPath(normalizedPath);
  const isGuidesIndex = normalizedPath === '/guias/';
  const isWhatsappConnect = normalizedPath === '/whatsapp/connect/';
  const isWhatsappConnectCallback = normalizedPath === '/whatsapp/connect/callback/';
  const url = `${siteUrl}${normalizedPath === '/' ? '/' : normalizedPath}`;

  if (isWhatsappConnect) {
    return {
      title: 'Conectar WhatsApp Business | Maiatesta',
      description:
        'Página segura para conectar una cuenta de WhatsApp Business con la plataforma de Maiatesta mediante los servicios oficiales de Meta.',
      canonical: url,
      robots: 'noindex, nofollow',
      ogTitle: 'Conectar WhatsApp Business | Maiatesta',
      ogDescription:
        'Página segura para conectar una cuenta de WhatsApp Business con la plataforma de Maiatesta mediante los servicios oficiales de Meta.',
      ogUrl: url,
      twitterTitle: 'Conectar WhatsApp Business | Maiatesta',
      twitterDescription:
        'Página segura para conectar una cuenta de WhatsApp Business con la plataforma de Maiatesta mediante los servicios oficiales de Meta.',
    };
  }

  if (isWhatsappConnectCallback) {
    return {
      title: 'Conexión con Meta | Maiatesta',
      description: 'Página técnica de retorno para la conexión de WhatsApp Business con Maiatesta mediante Meta.',
      canonical: url,
      robots: 'noindex, nofollow',
      ogTitle: 'Conexión con Meta | Maiatesta',
      ogDescription: 'Página técnica de retorno para la conexión de WhatsApp Business con Maiatesta mediante Meta.',
      ogUrl: url,
      twitterTitle: 'Conexión con Meta | Maiatesta',
      twitterDescription: 'Página técnica de retorno para la conexión de WhatsApp Business con Maiatesta mediante Meta.',
    };
  }

  if (isGuidesIndex) {
    return {
      title: 'Guías de software, páginas web y chatbots para pymes en Ecuador | Maiatesta',
      description:
        'Guías prácticas de Maiatesta para pymes en Quito y Ecuador sobre páginas web, chatbots de WhatsApp, inventario, Excel y software.',
      canonical: url,
      ogTitle: 'Guías de software, páginas web y chatbots para pymes en Ecuador | Maiatesta',
      ogDescription:
        'Recursos claros para decidir antes de cotizar software, web o automatización con Maiatesta en Quito.',
      ogUrl: url,
      twitterTitle: 'Guías de software, páginas web y chatbots para pymes en Ecuador | Maiatesta',
      twitterDescription:
        'Guías prácticas para pymes en Quito y Ecuador sobre web, chatbots, inventario, Excel y software.',
    };
  }

  if (articlePage) {
    return {
      title: articlePage.metaTitle,
      description: articlePage.metaDescription,
      canonical: url,
      ogType: 'article',
      ogTitle: articlePage.metaTitle,
      ogDescription: articlePage.metaDescription,
      ogUrl: url,
      ogArticlePublishedTime: `${articlePage.publishDate}T00:00:00Z`,
      ogArticleModifiedTime: `${articlePage.updatedDate}T00:00:00Z`,
      twitterTitle: articlePage.metaTitle,
      twitterDescription: articlePage.metaDescription,
    };
  }

  if (servicePage) {
    return {
      title: servicePage.metaTitle,
      description: servicePage.metaDescription,
      canonical: url,
      ogTitle: servicePage.metaTitle,
      ogDescription: servicePage.metaDescription,
      ogUrl: url,
      twitterTitle: servicePage.metaTitle,
      twitterDescription: servicePage.metaDescription,
    };
  }

  if (pillarPage) {
    return {
      title: pillarPage.metaTitle,
      description: pillarPage.metaDescription,
      canonical: url,
      ogTitle: pillarPage.metaTitle,
      ogDescription: pillarPage.metaDescription,
      ogUrl: url,
      twitterTitle: pillarPage.metaTitle,
      twitterDescription: pillarPage.metaDescription,
    };
  }

  if (legalPage) {
    return {
      title: legalPage.metaTitle,
      description: legalPage.metaDescription,
      canonical: url,
      ogTitle: legalPage.metaTitle,
      ogDescription: legalPage.metaDescription,
      ogUrl: url,
      twitterTitle: legalPage.metaTitle,
      twitterDescription: legalPage.metaDescription,
    };
  }

  return {
    title: 'Desarrollo de Software, Web y Automatización en Quito | Maiatesta',
    description:
      'Maiatesta es una agencia digital en Quito especializada en desarrollo de software, páginas web, tiendas online, chatbots de WhatsApp y automatización para pymes.',
    canonical: `${siteUrl}/`,
    ogTitle: 'Desarrollo de Software, Web y Automatización en Quito | Maiatesta',
    ogDescription:
      'Maiatesta es una agencia digital en Quito especializada en desarrollo de software, páginas web, tiendas online, chatbots de WhatsApp y automatización para pymes.',
    ogUrl: `${siteUrl}/`,
    twitterTitle: 'Desarrollo de Software, Web y Automatización en Quito | Maiatesta',
    twitterDescription:
      'Maiatesta es una agencia digital en Quito especializada en desarrollo de software, páginas web, tiendas online, chatbots de WhatsApp y automatización para pymes.',
  };
}

export function getRouteStructuredData(routePath = '/') {
  const normalizedPath = normalizeRoutePath(routePath);
  const articlePage = getArticlePageByPath(normalizedPath);
  const servicePage = getServicePageByPath(normalizedPath);
  const pillarPage = getPillarPageByPath(normalizedPath);
  const legalPage = getLegalPageByPath(normalizedPath);
  const isGuidesIndex = normalizedPath === '/guias/';
  const isNoindexUtilityRoute = noindexRoutes.includes(normalizedPath);
  const graph: Array<Record<string, unknown>> = [
    localBusinessSchema,
    websiteSchema,
  ];

  if (isNoindexUtilityRoute) {
    // Utility/onboarding pages are noindex — keep only minimal business
    // identity data, skip the commercial offer catalog used on indexed pages.
    return {
      '@context': 'https://schema.org',
      '@graph': [localBusinessSchema, websiteSchema],
    };
  }

  if (legalPage) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: legalPage.title, item: `${siteUrl}${normalizedPath}` },
      ],
    });
  } else if (isGuidesIndex) {
    graph.push({
      '@type': 'CollectionPage',
      '@id': `${siteUrl}/guias/#collection`,
      name: 'Guías prácticas para negocios en Quito y Ecuador',
      description:
        'Guías de Maiatesta sobre desarrollo web, chatbots de WhatsApp, inventario, Excel y software para pymes.',
      inLanguage: 'es',
      publisher: { '@id': `${siteUrl}/#localbusiness` },
      isPartOf: { '@id': `${siteUrl}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articlePages.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${siteUrl}/guias/${page.slug}/`,
          name: page.title,
        })),
      },
    });
  } else if (articlePage) {
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${siteUrl}${normalizedPath}#article`,
      headline: articlePage.h1,
      name: articlePage.title,
      description: articlePage.metaDescription,
      datePublished: articlePage.publishDate,
      dateModified: articlePage.updatedDate,
      inLanguage: 'es',
      author: { '@id': `${siteUrl}/#localbusiness` },
      publisher: { '@id': `${siteUrl}/#localbusiness` },
      mainEntityOfPage: `${siteUrl}${normalizedPath}`,
      about: articlePage.primaryKeyword,
      isPartOf: { '@id': `${siteUrl}/#website` },
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Guías', item: `${siteUrl}/guias/` },
        { '@type': 'ListItem', position: 3, name: articlePage.title, item: `${siteUrl}${normalizedPath}` },
      ],
    });
  } else if (servicePage) {
    graph.push({
      '@type': 'Service',
      '@id': `${siteUrl}${normalizedPath}#service`,
      name: servicePage.title,
      serviceType: servicePage.primaryKeyword,
      description: servicePage.metaDescription,
      provider: { '@id': `${siteUrl}/#localbusiness` },
      areaServed: [
        { '@type': 'City', name: 'Quito' },
        { '@type': 'AdministrativeArea', name: 'Pichincha' },
        { '@type': 'Country', name: 'Ecuador' },
      ],
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        priceCurrency: 'USD',
        description: servicePage.priceHint,
        url: `${siteUrl}${normalizedPath}`,
      },
      mainEntityOfPage: `${siteUrl}${normalizedPath}`,
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: servicePage.title, item: `${siteUrl}${normalizedPath}` },
      ],
    });
  } else if (pillarPage) {
    graph.push({
      '@type': 'Service',
      '@id': `${siteUrl}${normalizedPath}#service`,
      name: pillarPage.title,
      serviceType: pillarPage.primaryKeyword,
      description: pillarPage.metaDescription,
      provider: { '@id': `${siteUrl}/#localbusiness` },
      areaServed: [
        { '@type': 'City', name: 'Quito' },
        { '@type': 'AdministrativeArea', name: 'Pichincha' },
        { '@type': 'Country', name: 'Ecuador' },
      ],
      mainEntityOfPage: `${siteUrl}${normalizedPath}`,
    });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: pillarPage.title, item: `${siteUrl}${normalizedPath}` },
      ],
    });
  } else {
    graph[0] = {
      ...localBusinessSchema,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Servicios digitales accesibles en Quito',
        itemListElement: servicePages.slice(0, 5).map((page) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: page.title,
            description: page.metaDescription,
            areaServed: { '@type': 'City', name: 'Quito' },
            url: `${siteUrl}/servicios/${page.slug}/`,
          },
        })),
      },
      subjectOf: articlePages.slice(0, 4).map((page) => ({
        '@type': 'BlogPosting',
        headline: page.title,
        url: `${siteUrl}/guias/${page.slug}/`,
      })),
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function render(routePath = '/') {
  const normalizedPath = normalizeRoutePath(routePath);

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
        <App routePath={normalizedPath} />
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
