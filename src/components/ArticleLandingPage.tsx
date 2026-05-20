import { Header } from './Header';
import { Footer } from './Footer';
import { LuminousText } from './LuminousText';
import { siteContent } from '../data/siteContent';
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
          {article.sections.map((section, index) => (
            <section
              className='article-content-block scroll-reveal'
              key={section.heading}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
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
          >
            Pedir recomendación por WhatsApp
          </a>
        </section>
      </main>
      <Footer content={content} />
    </div>
  );
}
