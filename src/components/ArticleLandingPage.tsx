import { Header } from './Header';
import { Footer } from './Footer';
import { LuminousText } from './LuminousText';
import { siteContent } from '../data/siteContent';
import { trackWhatsAppClick } from '../utils/analytics';
import { articlePagesBySlug } from '../data/articlePages';
import type { ArticleRouteSlug } from '../data/articleRoutes';
import { servicePagesBySlug } from '../data/servicePages';
import type { LanguageCode } from '../data/siteContent';

type ArticleLandingPageProps = {
  slug: ArticleRouteSlug;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

const articleHighlightPhrases = [
  'Quito',
  'Ecuador',
  'WhatsApp',
  'Excel',
  'inventario',
  'pymes',
];

const articleEditorialImages = {
  'cuanto-cuesta-chatbot-whatsapp-ecuador': {
    filename: 'guide-chatbot-lead-flow',
    placement: 'intro',
    alt: 'Simulación de interfaz de chat con flujos lógicos estructurados para captación automatizada de leads calificados.',
    caption:
      'Los flujos automatizados pre-califican tráfico masivo antes de enviarlo a asesores comerciales.',
  },
  'pagina-web-negocio-pequeno-quito': {
    filename: 'guide-web-pyme-local-seo',
    placement: 'after-first-section',
    alt: 'Sitio web corporativo de alto rendimiento desplegado en una pantalla portátil con optimización SEO local.',
    caption:
      'Una presencia web veloz convierte visitantes locales en clientes activos sin depender de presupuestos masivos.',
  },
  'software-inventario-pymes-quito': {
    filename: 'guide-inventory-logistics-dashboard',
    placement: 'Señales de que Excel ya no alcanza',
    alt: 'Panel táctil de gestión logística y control de existencias en tiempo real con diseño responsivo.',
    caption:
      'La transición de hojas de cálculo a sistemas dedicados previene pérdidas ocultas en el inventario.',
  },
  'automatizar-reportes-excel-pyme': {
    filename: 'guide-excel-reporting-dashboard',
    placement: 'Qué reportes conviene automatizar',
    alt: 'Gráficos vectoriales y visualizaciones analíticas unificadas en un tablero operativo automatizado.',
    caption:
      'La centralización de reportes comerciales provee visibilidad financiera inmediata a la gerencia.',
  },
  'cuanto-cuesta-software-a-medida-ecuador': {
    filename: 'guide-software-cost-comparison',
    placement: 'after-first-section',
    alt: 'Comparación visual de rangos de inversión para software a medida en Ecuador',
    caption:
      'La inversión suele variar según módulos, integraciones, usuarios y nivel de soporte requerido.',
  },
  'software-a-medida-vs-excel-pyme': {
    filename: 'guide-software-vs-excel-dashboard',
    placement: 'after-first-section',
    alt: 'Comparación visual entre reportes manuales en Excel y software a medida',
    caption:
      'Pasar de hojas manuales a un sistema propio ayuda a centralizar datos, permisos y reportes.',
  },
} satisfies Partial<Record<
  ArticleRouteSlug,
  { filename: string; placement: string; alt: string; caption: string }
>>;

function EditorialFigure({
  filename,
  alt,
  caption,
}: {
  filename: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className='content-figure content-figure--wide w-full overflow-hidden rounded-xl bg-[#0B0B0F] my-8'>
      <picture className='block w-full aspect-[16/9] bg-[#0B0B0F]'>
        <source srcSet={`/assets/editorial/${filename}.avif`} type='image/avif' />
        <source srcSet={`/assets/editorial/${filename}.webp`} type='image/webp' />
        <img
          src={`/assets/editorial/${filename}.webp`}
          alt={alt}
          width='960'
          height='540'
          loading='lazy'
          decoding='async'
          className='w-full h-auto aspect-[16/9] object-cover block transition-opacity duration-300'
        />
      </picture>
      <figcaption className='text-sm text-gray-400 mt-2 px-1 architectural-caption'>
        {caption}
      </figcaption>
    </figure>
  );
}

/** Full SEO article page: hero, structured body sections with editorial images, related service CTA and footer. */
export function ArticleLandingPage({
  slug,
  language,
  onLanguageChange,
}: ArticleLandingPageProps) {
  const article = articlePagesBySlug[slug];
  const content = siteContent.locales.es;

  if (!article) {
    return (
      <div className='app-shell service-page-shell' data-palette='atlantic'>
        <section className='service-page-hero' id='top'>
          <div className='hero-scrim' />
          <Header
            content={content}
            language={language}
            onLanguageChange={onLanguageChange}
            homeHref='/'
            navHrefPrefix='/'
          />
          <div className='service-page-hero__inner'>
            <div className='service-page-copy'>
              <p className='eyebrow'>Guía no encontrada</p>
              <h1>Esta guía todavía no está publicada.</h1>
              <p className='hero-body'>
                Vuelve a la página principal para revisar los servicios de
                Maiatesta.
              </p>
              <div className='hero-actions'>
                <a className='button button-primary' href='/'>
                  Volver al inicio
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const productById = new Map(
    content.products.map((product) => [product.id, product]),
  );
  const whatsappHref = `https://wa.me/593963092859?text=${encodeURIComponent(
    article.ctaMessage,
  )}`;
  const editorialImage = (articleEditorialImages as Partial<Record<ArticleRouteSlug, { filename: string; placement: string; alt: string; caption: string }>>)[slug];

  return (
    <div className='app-shell service-page-shell' data-palette='atlantic'>
      <div className='page-meteors' aria-hidden='true'>
        <span className='page-meteor page-meteor--a' />
        <span className='page-meteor page-meteor--b' />
      </div>
      <section className='service-page-hero article-page-hero' id='top'>
        <div className='hero-stars hero-stars--far' aria-hidden='true' />
        <div className='hero-stars hero-stars--near' aria-hidden='true' />
        <div className='hero-aurora' aria-hidden='true' />
        <div className='hero-grain' aria-hidden='true' />
        <div className='hero-scrim' />
        <Header
          content={content}
          language={language}
          onLanguageChange={onLanguageChange}
          homeHref='/'
          navHrefPrefix='/'
        />
        <div className='service-page-hero__inner'>
          <div className='service-page-copy reveal'>
            <p className='eyebrow'>Guía local · {article.primaryKeyword}</p>
            <h1>
              <LuminousText
                text={article.h1}
                phrases={articleHighlightPhrases}
              />
            </h1>
            <p className='hero-body'>{article.excerpt}</p>
            <p className='service-price-hint'>{article.searchIntent}</p>
            <div className='hero-actions'>
              <a
                className='button button-primary'
                href={whatsappHref}
                target='_blank'
                rel='noreferrer'
                data-conversion='whatsapp'
                data-page-slug={article.slug}
                data-page-type='article'
                onClick={() => trackWhatsAppClick({ ctaLocation: 'hero', pageSlug: article.slug, pageType: 'article' })}
              >
                Pedir recomendación por WhatsApp
              </a>
              <a className='button button-secondary' href='/#services'>
                Ver servicios
              </a>
            </div>
          </div>
          <aside className='service-proof-card reveal' style={{ animationDelay: '120ms' }}>
            <span>Publicado</span>
            <strong>{article.publishDate}</strong>
            <p>{article.metaDescription}</p>
            <small>Actualizado: {article.updatedDate}</small>
          </aside>
        </div>
      </section>

      <main className='service-page-main article-page-main'>
        <article className='section article-body-section'>
          {editorialImage?.placement === 'intro' ? (
            <EditorialFigure
              filename={editorialImage.filename}
              alt={editorialImage.alt}
              caption={editorialImage.caption}
            />
          ) : null}
          {article.sections.map((section, index) => (
            <section
              className='article-content-block scroll-reveal'
              key={section.heading}
              style={{ animationDelay: `${Math.min(index * 40, 120)}ms` }}
            >
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {editorialImage?.placement === 'after-first-section' &&
              index === 0 ? (
                <EditorialFigure
                  filename={editorialImage.filename}
                  alt={editorialImage.alt}
                  caption={editorialImage.caption}
                />
              ) : null}
              {editorialImage?.placement === section.heading ? (
                <EditorialFigure
                  filename={editorialImage.filename}
                  alt={editorialImage.alt}
                  caption={editorialImage.caption}
                />
              ) : null}
            </section>
          ))}
        </article>

        <section className='section service-faq-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Preguntas frecuentes</p>
            <h2>Respuestas rápidas para tomar una decisión.</h2>
          </div>
          <div className='local-faq-grid'>
            {article.faqs.map((faq, index) => (
              <details
                className='local-faq-item scroll-reveal'
                key={faq.question}
                style={{ animationDelay: `${Math.min(index * 35, 120)}ms` }}
              >
                <summary>
                  <span className='local-faq-question'>{faq.question}</span>
                  <span className='local-faq-toggle' aria-hidden='true' />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className='section service-related-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Servicios relacionados</p>
            <h2>Convierte esta guía en una acción concreta.</h2>
          </div>
          <div className='service-related-grid'>
            {article.relatedServiceIds.map((relatedId) => {
              const relatedProduct = productById.get(relatedId);
              const relatedPage = Object.values(servicePagesBySlug).find(
                (candidate) => candidate.productId === relatedId,
              );

              if (!relatedProduct || !relatedPage) {
                return null;
              }

              return (
                <a
                  className='service-related-card scroll-reveal'
                  href={`/servicios/${relatedPage.slug}/`}
                  key={relatedId}
                >
                  <span>{relatedProduct.title}</span>
                  <strong>{relatedProduct.accent}</strong>
                </a>
              );
            })}
          </div>
        </section>

        <section className='section service-cta-section scroll-reveal'>
          <p className='eyebrow'>Siguiente paso</p>
          <h2>Cuéntame qué quieres resolver en tu pyme.</h2>
          <p>
            Maiatesta trabaja con negocios en Quito, Pichincha y Ecuador que
            necesitan páginas web, chatbots, inventario, software o
            automatización sin inflar el alcance.
          </p>
          <a
            className='button button-primary'
            href={whatsappHref}
            target='_blank'
            rel='noreferrer'
            data-conversion='whatsapp'
            data-page-slug={article.slug}
            data-page-type='article'
            onClick={() => trackWhatsAppClick({ ctaLocation: 'cta-section', pageSlug: article.slug, pageType: 'article' })}
          >
            Pedir recomendación por WhatsApp
          </a>
        </section>
      </main>
      <Footer content={content} />
    </div>
  );
}
