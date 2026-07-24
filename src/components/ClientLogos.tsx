import type { LocalizedContent } from '../data/siteContent';

type ClientLogosProps = {
  content: LocalizedContent;
};

export function ClientLogos({ content }: ClientLogosProps) {
  if (content.clients.length === 0) return null;

  const clientNameList = content.clients.map((c) => c.name).join(', ');

  return (
    <section className='client-ticker' aria-labelledby='client-ticker-title'>
      <h2 id='client-ticker-title' className='sr-only'>
        {content.sections.clients.title}
      </h2>
      <p className='sr-only'>
        {content.sections.clients.eyebrow}: {clientNameList}.
      </p>

      <div className='client-ticker__layout'>
        <p className='client-ticker__label' aria-hidden='true'>
          {content.sections.clients.eyebrow}
        </p>

        <div className='client-ticker__track'>
          <div className='client-ticker__inner'>
            <ul className='client-ticker__list'>
              {content.clients.map((client) => (
                <li key={client.name} className='client-ticker__item'>
                  <a
                    className='client-ticker__link'
                    href={client.href}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={`${client.name} · ${client.sector}`}
                  >
                    <img
                      src={client.logo}
                      alt={client.alt}
                      width={client.width}
                      height={client.height}
                      decoding='async'
                    />
                  </a>
                </li>
              ))}
            </ul>
            <ul className='client-ticker__list' aria-hidden='true'>
              {content.clients.map((client) => (
                <li key={`${client.name}-dup`} className='client-ticker__item'>
                  <span className='client-ticker__link'>
                    <img
                      src={client.logo}
                      alt=''
                      width={client.width}
                      height={client.height}
                      loading='lazy'
                      decoding='async'
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
