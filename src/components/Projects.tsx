import type { LocalizedContent } from '../data/siteContent';
import { LuminousText } from './LuminousText';

const projectsHighlightPhrases = [
  'without enterprise budgets',
  'Clear starting points',
  'sin presupuesto empresarial',
  'Puntos de partida claros',
];

type ProjectsProps = {
  content: LocalizedContent;
};

export function Projects({ content }: ProjectsProps) {
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label.toLowerCase() === 'whatsapp',
  );

  return (
    <section className='section projects-section' id='projects'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.sections.projects.eyebrow}</p>
        <h2>
          <LuminousText
            text={content.sections.projects.title}
            phrases={projectsHighlightPhrases}
          />
        </h2>
        <p>{content.sections.projects.body}</p>
      </div>
      <figure className='content-figure content-figure--wide w-full overflow-hidden rounded-xl bg-[#0B0B0F] my-8'>
        <picture className='block w-full aspect-[16/9] bg-[#0B0B0F]'>
          <source
            srcSet='/assets/editorial/homepage-projects-dark-workstation.avif'
            type='image/avif'
          />
          <source
            srcSet='/assets/editorial/homepage-projects-dark-workstation.webp'
            type='image/webp'
          />
          <img
            src='/assets/editorial/homepage-projects-dark-workstation.webp'
            alt='Estación de trabajo digital en modo oscuro mostrando interfaces de administración y optimización de rendimiento.'
            width='960'
            height='540'
            loading='lazy'
            decoding='async'
            className='w-full h-auto aspect-[16/9] object-cover block transition-opacity duration-300'
          />
        </picture>
        <figcaption className='text-sm text-gray-400 mt-2 px-1 architectural-caption'>
          Infraestructura robusta diseñada para mantener el flujo de caja
          constante mediante procesos escalables.
        </figcaption>
      </figure>
      <div className='project-grid'>
        {content.projects.map((project, index) => (
          <article
            className={
              project.features
                ? `project-card project-card-package${
                    project.featured ? ' featured' : ''
                  } scroll-reveal`
                : 'project-card scroll-reveal'
            }
            key={project.name}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {project.badgeText ? (
              <div className='project-card-badge'>{project.badgeText}</div>
            ) : null}
            <span>{project.type}</span>
            <h3>{project.name}</h3>
            <p>{project.result}</p>
            {project.features ? (
              <>
                <ul className='project-feature-list'>
                  {project.features.map((feature) => (
                    <li
                      className={[
                        feature.included ? 'included' : 'excluded',
                        feature.emphasized ? 'emphasized' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={feature.label}
                    >
                      <span aria-hidden='true'>
                        {feature.included ? '\u2713' : '\u00d7'}
                      </span>
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
                {project.ctaText && whatsappChannel ? (
                  <div className='project-card-cta'>
                    <strong>{project.ctaText}</strong>
                    <a
                      className='project-whatsapp-link'
                      href={whatsappChannel.href}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={project.ctaText}
                    >
                      <svg
                        aria-hidden='true'
                        viewBox='0 0 32 32'
                        role='img'
                      >
                        <path d='M16 3.2A12.7 12.7 0 0 0 5 22.3L3.4 28.8l6.7-1.6A12.8 12.8 0 1 0 16 3.2Zm0 23.1c-2 0-4-.6-5.7-1.7l-.4-.2-4 .9.9-3.9-.3-.4a10.4 10.4 0 1 1 9.5 5.3Zm5.8-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.3 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z' />
                      </svg>
                    </a>
                  </div>
                ) : null}
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
