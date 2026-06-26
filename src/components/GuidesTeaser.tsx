import { articlePages } from '../data/articlePages';
import type { ArticleRouteSlug } from '../data/articleRoutes';

const featuredGuides = articlePages.slice(0, 3);

const guideThumbnails: Partial<Record<ArticleRouteSlug, string>> = {
  'cuanto-cuesta-chatbot-whatsapp-ecuador': '/assets/previews/guide-chatbot-thumb.webp',
  'pagina-web-negocio-pequeno-quito': '/assets/previews/guide-web-pyme-thumb.webp',
  'software-inventario-pymes-quito': '/assets/previews/guide-inventory-thumb.webp',
  'automatizar-reportes-excel-pyme': '/assets/previews/guide-excel-thumb.webp',
  'cuanto-cuesta-software-a-medida-ecuador': '/assets/previews/guide-software-cost-thumb.webp',
  'software-a-medida-vs-excel-pyme': '/assets/previews/guide-software-vs-excel-thumb.webp',
};

/** Teaser grid of the latest SEO guides. Statically renders links to article pages. */
export function GuidesTeaser() {
  return (
    <section className='section guides-teaser-section' aria-labelledby='guides-teaser-title'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>Guías prácticas</p>
        <h2 id='guides-teaser-title'>Respuestas útiles antes de cotizar.</h2>
        <p>
          Contenido corto para negocios en Quito y Ecuador que quieren decidir
          mejor antes de invertir en software, web o automatización.
        </p>
      </div>

      <div className='guides-card-grid'>
        {featuredGuides.map((guide, index) => (
          <article
            className='guide-card scroll-reveal'
            key={guide.slug}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {guideThumbnails[guide.slug] ? (
              <img
                className='guide-card-thumb'
                src={guideThumbnails[guide.slug]}
                alt=''
                width='320'
                height='200'
                loading='lazy'
                decoding='async'
              />
            ) : null}
            <span>{guide.primaryKeyword}</span>
            <h3>{guide.title}</h3>
            <p>{guide.excerpt}</p>
            <a href={`/guias/${guide.slug}/`}>Leer guía</a>
          </article>
        ))}
      </div>

      <a className='guides-index-link scroll-reveal' href='/guias/'>
        Ver todas las guías
      </a>
    </section>
  );
}
