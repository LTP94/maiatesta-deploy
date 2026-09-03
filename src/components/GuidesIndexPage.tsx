import { Header } from './Header';
import { Footer } from './Footer';
import { LuminousText } from './LuminousText';
import { articlePages } from '../data/articlePages';
import { getArticleCardText } from '../data/articleTranslations';
import type { ArticleRouteSlug } from '../data/articleRoutes';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';

const guideThumbnails: Partial<Record<ArticleRouteSlug, string>> = {
  'cuanto-cuesta-chatbot-whatsapp-ecuador': '/assets/previews/guide-chatbot-thumb.webp',
  'pagina-web-negocio-pequeno-quito': '/assets/previews/guide-web-pyme-thumb.webp',
  'software-inventario-pymes-quito': '/assets/previews/guide-inventory-thumb.webp',
  'automatizar-reportes-excel-pyme': '/assets/previews/guide-excel-thumb.webp',
  'cuanto-cuesta-software-a-medida-ecuador': '/assets/previews/guide-software-cost-thumb.webp',
  'software-a-medida-vs-excel-pyme': '/assets/previews/guide-software-vs-excel-thumb.webp',
};

type GuidesIndexPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

/** Full guides index page listing all SEO article cards, their sections and read-time estimates. */
export function GuidesIndexPage({
  language,
  onLanguageChange,
}: GuidesIndexPageProps) {
  const content = siteContent.locales[language];

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
            <p className='eyebrow'>{content.guidesIndex.eyebrow}</p>
            <h1>
              <LuminousText
                text={content.guidesIndex.heroTitle}
                phrases={content.guidesIndex.heroTitlePhrases}
              />
            </h1>
            <p className='hero-body'>{content.guidesIndex.heroBody}</p>
            <div className='hero-actions'>
              <a className='button button-primary' href='/#contact'>
                {content.hero.primaryCta}
              </a>
              <a className='button button-secondary' href='/#services'>
                {content.hero.secondaryCta}
              </a>
            </div>
          </div>
          <aside className='service-proof-card reveal' style={{ animationDelay: '120ms' }}>
            <span>{content.guidesIndex.proofEyebrow}</span>
            <strong>{content.guidesIndex.proofTitle}</strong>
            <p>{content.guidesIndex.proofBody}</p>
          </aside>
        </div>
      </section>

      <main className='service-page-main'>
        <section className='section guides-index-section'>
          <div className='section-heading scroll-reveal'>
            <p className='eyebrow'>{content.guidesIndex.sectionEyebrow}</p>
            <h2>{content.guidesIndex.sectionTitle}</h2>
            <p>{content.guidesIndex.sectionBody}</p>
          </div>

          <div className='guides-card-grid guides-card-grid--index'>
            {articlePages.map((guide, index) => {
              const cardText = getArticleCardText(guide, language);
              return (
                <article
                  className='guide-card scroll-reveal'
                  key={guide.slug}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  {guideThumbnails[guide.slug] ? (
                    <img
                      className='guide-card-thumb'
                      src={guideThumbnails[guide.slug]}
                      alt={`${content.guidesIndex.imageAltPrefix}${cardText.title}`}
                      width='320'
                      height='200'
                      loading='lazy'
                      decoding='async'
                    />
                  ) : null}
                  <span>{cardText.primaryKeyword}</span>
                  <h2>{cardText.title}</h2>
                  <p>{cardText.excerpt}</p>
                  <a href={`/guias/${guide.slug}/`}>{content.guidesIndex.readMoreLabel}</a>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <Footer content={content} language={language} />
    </div>
  );
}
