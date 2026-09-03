import { Header } from './Header';
import { Footer } from './Footer';
import { legalPagesBySlug } from '../data/legalPages';
import type { LegalBlock } from '../data/legalPages';
import type { LegalRouteSlug } from '../data/legalRoutes';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';

type LegalPageProps = {
  slug: LegalRouteSlug;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

function LegalBlockContent({ block }: { block: LegalBlock }) {
  if (block.type === 'paragraph') {
    return <p>{block.text}</p>;
  }

  if (block.type === 'list') {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'subheading') {
    return <h3>{block.text}</h3>;
  }

  return null;
}

export function LegalPage({
  slug,
  language,
  onLanguageChange,
}: LegalPageProps) {
  const page = legalPagesBySlug[slug];
  const content = siteContent.locales[language];

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
              <p className='eyebrow'>Legal</p>
              <h1>Página no encontrada.</h1>
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

  return (
    <div className='app-shell service-page-shell' data-palette='atlantic'>
      <section className='service-page-hero legal-page-hero' id='top'>
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
            <p className='eyebrow'>Legal</p>
            <h1>{page.h1}</h1>
            <p className='hero-body'>
              Responsable: MaiAtesta S.A.S.
            </p>
            <p className='hero-body'>
              Última actualización:{' '}
              <time dateTime={page.lastUpdated}>
                {new Date(page.lastUpdated + 'T00:00:00').toLocaleDateString('es-EC', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </p>
          </div>
        </div>
      </section>

      <main className='service-page-main'>
        <article className='section legal-content'>
          {page.sections.map((section) => (
            <section
              className='legal-section'
              key={section.id}
              id={section.id}
            >
              <h2>{section.heading}</h2>
              {section.blocks.map((block, blockIndex) => (
                <LegalBlockContent
                  block={block}
                  key={`${section.id}-${blockIndex}`}
                />
              ))}
            </section>
          ))}
        </article>
      </main>

      <Footer content={content} language={language} />
    </div>
  );
}
