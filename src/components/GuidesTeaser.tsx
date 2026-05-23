import { articlePages } from '../data/articlePages';

const featuredGuides = articlePages.slice(0, 3);

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
