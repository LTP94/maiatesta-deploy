import type { LocalizedContent } from '../data/siteContent';

// ─── Lazy-load fallbacks ──────────────────────────────────────────────────────

export function TypebotFallback({ content }: { content: LocalizedContent }) {
  return (
    <section className='site-main-typebot-chat scroll-fallback' aria-label='Kipux chat'>
      <div className='bot-invite'>
        <p className='bot-invite__eyebrow'>{content.bot.eyebrow}</p>
        <h2 className='bot-invite__title'>{content.bot.title}</h2>
        <p className='bot-invite__body'>{content.bot.body}</p>
      </div>
    </section>
  );
}

export function ContactFallback({ content }: { content: LocalizedContent }) {
  return (
    <section id='contact' className='section contact-section scroll-fallback' aria-busy='true'>
      <div className='contact-copy'>
        <p className='eyebrow'>{content.contact.eyebrow}</p>
        <h2>{content.contact.title}</h2>
        <p>{content.contact.body}</p>
      </div>
    </section>
  );
}

export function RouteFallback({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className='app-shell service-page-shell' data-palette='atlantic'>
      <section className='service-page-hero' id='top'>
        <div className='hero-scrim' />
        <div className='service-page-hero__inner'>
          <div className='service-page-copy'>
            <p className='eyebrow'>{eyebrow}</p>
            <h1>{title}</h1>
            <p className='hero-body'>{body}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Section hydration shells ─────────────────────────────────────────────────

function SectionShellHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className='section-heading scroll-reveal'>
      <p className='eyebrow'>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function ServicesShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section services-section section-hydration-shell section-shell--services'
      id='services'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.sections.services.eyebrow}
        title={content.sections.services.title}
        body={content.sections.services.body}
      />
      <div className='roulette-layout'>
        <div className='service-carousel scroll-reveal'>
          <div className='service-shell-card' aria-hidden='true'>
            <span className='service-card-index'>01</span>
            <span className='service-card-preview'>
              <span className='service-preview-frame'>
                <span className='service-preview-skeleton' aria-hidden='true' />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProjectsShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section projects-section section-hydration-shell section-shell--projects'
      id='projects'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.sections.projects.eyebrow}
        title={content.sections.projects.title}
        body={content.sections.projects.body}
      />
      <div className='project-grid'>
        {[0, 1, 2].map((index) => (
          <article
            className='project-card section-shell-card scroll-reveal'
            key={index}
            aria-hidden='true'
          />
        ))}
      </div>
    </section>
  );
}

export function FaqShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section local-faq-section section-hydration-shell section-shell--faq'
      id='local-faq'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.faqs.eyebrow}
        title={content.faqs.title}
        body={content.faqs.body}
      />
      <div className='local-faq-grid'>
        {[0, 1, 2].map((index) => (
          <article
            className='local-faq-item section-shell-card scroll-reveal'
            key={index}
            aria-hidden='true'
          />
        ))}
      </div>
    </section>
  );
}
