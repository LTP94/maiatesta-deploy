import { Header } from './Header';
import { Footer } from './Footer';
import { LuminousText } from './LuminousText';
import { articlePages } from '../data/articlePages';
import { siteContent } from '../data/siteContent';
import { servicePagesBySlug } from '../data/servicePages';
import type { ServiceRouteSlug } from '../data/serviceRoutes';
import type { LanguageCode } from '../data/siteContent';

type ServiceLandingPageProps = {
  slug: ServiceRouteSlug;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

const serviceHighlightPhrases = [
  'Quito',
  'Pichincha',
  'pymes',
  'WhatsApp',
  'Ecuador',
  'software',
];

/** Full service landing page: hero with ambient video, detail cards, process steps, related services and contact CTA. */
export function ServiceLandingPage({
  slug,
  language,
  onLanguageChange,
}: ServiceLandingPageProps) {
  const page = servicePagesBySlug[slug];
  const content = siteContent.locales.es;

  if (!page) {
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
              <p className='eyebrow'>Servicio no encontrado</p>
              <h1>Este servicio todavía no está publicado.</h1>
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
  const product = productById.get(page.productId);
  const relatedGuides = articlePages
    .filter((article) => article.relatedServiceIds.includes(page.productId))
    .slice(0, 2);
  const whatsappHref = `https://wa.me/593963092859?text=${encodeURIComponent(
    page.ctaMessage,
  )}`;

  return (
    <div className='app-shell service-page-shell' data-palette='atlantic'>
      <div className='page-meteors' aria-hidden='true'>
        <span className='page-meteor page-meteor--a' />
        <span className='page-meteor page-meteor--b' />
      </div>
      <section className='service-page-hero' id='top'>
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
            <p className='eyebrow'>{page.title}</p>
            <h1>
              <LuminousText text={page.h1} phrases={serviceHighlightPhrases} />
            </h1>
            <p className='hero-body'>{page.intro}</p>
            <p className='service-price-hint'>{page.priceHint}</p>
            <div className='hero-actions'>
              <a
                className='button button-primary'
                href={whatsappHref}
                target='_blank'
                rel='noreferrer'
              >
                Cotizar por WhatsApp
              </a>
              <a className='button button-secondary' href='/#projects'>
                Ver paquetes
              </a>
            </div>
          </div>
          <aside className='service-proof-card reveal' style={{ animationDelay: '120ms' }}>
            <span>Servicio local</span>
            <strong>{page.primaryKeyword}</strong>
            <p>{page.proof}</p>
            {product ? <small>{product.accent}</small> : null}
          </aside>
        </div>
      </section>

      <main className='service-page-main'>
        <section className='section service-detail-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Qué incluye</p>
            <h2>Una solución pensada para negocios de Quito y Ecuador.</h2>
          </div>
          <div className='service-detail-grid'>
            {page.benefits.map((benefit, index) => (
              <article className='service-detail-card scroll-reveal' key={benefit}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{benefit}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='section service-detail-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Proceso</p>
            <h2>Cómo avanzamos sin inflar el proyecto.</h2>
          </div>
          <div className='service-process-list'>
            {page.process.map((step, index) => (
              <article className='service-process-step scroll-reveal' key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='section service-faq-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Preguntas frecuentes</p>
            <h2>Respuestas rápidas antes de cotizar.</h2>
          </div>
          <div className='local-faq-grid'>
            {page.faqs.map((faq, index) => (
              <details
                className='local-faq-item scroll-reveal'
                key={faq.question}
                style={{ animationDelay: `${index * 70}ms` }}
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

        {relatedGuides.length > 0 ? (
          <section className='section service-related-section service-guides-section'>
            <div className='section-heading scroll-reveal'>
              <p className='eyebrow'>Guías relacionadas</p>
              <h2>Lee antes de decidir el alcance.</h2>
            </div>
            <div className='service-related-grid service-guide-grid'>
              {relatedGuides.map((guide) => (
                <a
                  className='service-related-card guide-related-card scroll-reveal'
                  href={`/guias/${guide.slug}/`}
                  key={guide.slug}
                >
                  <span>{guide.primaryKeyword}</span>
                  <strong>{guide.title}</strong>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className='section service-related-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Servicios relacionados</p>
            <h2>Conecta esta solución con el resto de tu operación.</h2>
          </div>
          <div className='service-related-grid'>
            {page.relatedServiceIds.map((relatedId) => {
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
          <p className='eyebrow'>Cotización rápida</p>
          <h2>Cuéntame qué necesitas resolver en tu negocio.</h2>
          <p>
            Maiatesta trabaja con pymes, emprendimientos y profesionales en
            Quito, Pichincha y Ecuador. El primer paso es entender tu operación
            y recomendar una solución realista.
          </p>
          <a
            className='button button-primary'
            href={whatsappHref}
            target='_blank'
            rel='noreferrer'
          >
            Cotizar por WhatsApp
          </a>
        </section>
      </main>
      <Footer content={content} />
    </div>
  );
}
