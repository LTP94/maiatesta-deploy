import type { LocalizedContent } from '../data/siteContent';

type ClientLogosProps = {
  content: LocalizedContent;
};

export function ClientLogos({ content }: ClientLogosProps) {
  const clientNameList = content.clients.map((c) => c.name).join(', ');

  return (
    <section className='client-ticker' aria-labelledby='client-ticker-title'>
      <h2 id='client-ticker-title' className='sr-only'>
        Empresas y proyectos con los que hemos trabajado
      </h2>
      <p className='sr-only'>
        Proyectos reales en Ecuador: {clientNameList}.
      </p>

      <div className='client-ticker__track'>
        <div className='client-ticker__inner'>
          <ul className='client-ticker__list'>
            {content.clients.map((client) => (
              <li key={client.name} className='client-ticker__item'>
                <img
                  src={client.logo}
                  alt={client.alt}
                  width={client.width}
                  height={client.height}
                  loading='lazy'
                  decoding='async'
                />
              </li>
            ))}
          </ul>
          <ul className='client-ticker__list' aria-hidden='true'>
            {content.clients.map((client) => (
              <li key={`${client.name}-dup`} className='client-ticker__item'>
                <img
                  src={client.logo}
                  alt=''
                  width={client.width}
                  height={client.height}
                  loading='lazy'
                  decoding='async'
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
