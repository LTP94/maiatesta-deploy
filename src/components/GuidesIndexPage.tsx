import { Header } from './Header';
import { Footer } from './Footer';
import { LuminousText } from './LuminousText';
import { articlePages } from '../data/articlePages';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';

type GuidesIndexPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

/** Full guides index page listing all SEO article cards, their sections and read-time estimates. */
export function GuidesIndexPage({
  language,
  onLanguageChange,
}: GuidesIndexPageProps) {
  const content = siteContent.locales.es;

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
            <p className='eyebrow'>Guías Maiatesta</p>
            <h1>
              <LuminousText
                text='Guías prácticas para negocios en Quito y Ecuador'
                phrases={['Quito', 'Ecuador', 'negocios']}
              />
            </h1>
            <p className='hero-body'>
              Recursos claros para pymes que necesitan decidir sobre páginas
              web, chatbots de WhatsApp, inventario, Excel y software sin
              perder tiempo en explicaciones genéricas.
            </p>
            <div className='hero-actions'>
              <a className='button button-primary' href='/#contact'>
                Cotizar por WhatsApp
              </a>
              <a className='button button-secondary' href='/#services'>
                Ver servicios
              </a>
            </div>
          </div>
          <aside className='service-proof-card reveal' style={{ animationDelay: '120ms' }}>
            <span>Contenido local</span>
            <strong>Quito · Pichincha · Ecuador</strong>
            <p>
              Guías escritas para responder preguntas reales antes de cotizar
              una solución digital.
            </p>
          </aside>
        </div>
      </section>

      <main className='service-page-main'>
        <section className='section guides-index-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>Recursos para decidir</p>
            <h2>Elige una guía según el problema que quieres resolver.</h2>
            <p>
              Cada guía conecta con un servicio específico para que puedas
              pasar de la duda a una cotización concreta.
            </p>
          </div>

          <div className='guides-card-grid guides-card-grid--index'>
            {articlePages.map((guide, index) => (
              <article
                className='guide-card scroll-reveal'
                key={guide.slug}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span>{guide.primaryKeyword}</span>
                <h2>{guide.title}</h2>
                <p>{guide.excerpt}</p>
                <a href={`/guias/${guide.slug}/`}>Leer guía</a>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer content={content} />
    </div>
  );
}
