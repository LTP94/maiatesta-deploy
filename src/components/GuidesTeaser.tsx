import { articlePages } from '../data/articlePages';
import { getArticleCardText } from '../data/articleTranslations';
import type { ArticleRouteSlug } from '../data/articleRoutes';
import type { LanguageCode, LocalizedContent } from '../data/siteContent';

const featuredGuides = articlePages.slice(0, 3);

const guideThumbnails: Partial<Record<ArticleRouteSlug, string>> = {
  'cuanto-cuesta-chatbot-whatsapp-ecuador': '/assets/previews/guide-chatbot-thumb.webp',
  'pagina-web-negocio-pequeno-quito': '/assets/previews/guide-web-pyme-thumb.webp',
  'software-inventario-pymes-quito': '/assets/previews/guide-inventory-thumb.webp',
  'automatizar-reportes-excel-pyme': '/assets/previews/guide-excel-thumb.webp',
  'cuanto-cuesta-software-a-medida-ecuador': '/assets/previews/guide-software-cost-thumb.webp',
  'software-a-medida-vs-excel-pyme': '/assets/previews/guide-software-vs-excel-thumb.webp',
};

type GuidesTeaserProps = {
  content: LocalizedContent;
  language: LanguageCode;
};

/** Teaser grid of the latest SEO guides. Statically renders links to article pages.
 * Card title/excerpt/keyword have English translations (articleTranslations.ts);
 * the full article body stays Spanish-only. */
export function GuidesTeaser({ content, language }: GuidesTeaserProps) {
  const { guidesTeaser } = content.sections;
  const { readMoreLabel, imageAltPrefix } = content.guidesIndex;

  return (
    <section className='section guides-teaser-section' aria-labelledby='guides-teaser-title'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{guidesTeaser.eyebrow}</p>
        <h2 id='guides-teaser-title'>{guidesTeaser.title}</h2>
        <p>{guidesTeaser.body}</p>
      </div>

      <div className='guides-card-grid'>
        {featuredGuides.map((guide, index) => {
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
                  alt={`${imageAltPrefix}${cardText.title}`}
                  width='320'
                  height='200'
                  loading='lazy'
                  decoding='async'
                />
              ) : null}
              <span>{cardText.primaryKeyword}</span>
              <h3>{cardText.title}</h3>
              <p>{cardText.excerpt}</p>
              <a href={`/guias/${guide.slug}/`}>{readMoreLabel}</a>
            </article>
          );
        })}
      </div>

      <a className='guides-index-link scroll-reveal' href='/guias/'>
        {guidesTeaser.linkLabel}
      </a>
    </section>
  );
}
