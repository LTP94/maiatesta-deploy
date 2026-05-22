import type { LocalizedContent } from "../data/siteContent";
import { getServiceSlugForProductId } from "../data/serviceRoutes";

type FooterProps = {
  content: LocalizedContent;
};

const featuredGuideLinks = [
  {
    label: 'Costo de chatbot WhatsApp',
    href: '/guias/cuanto-cuesta-chatbot-whatsapp-ecuador/',
  },
  {
    label: 'Web para negocio pequeño',
    href: '/guias/pagina-web-negocio-pequeno-quito/',
  },
  {
    label: 'Inventario para pymes',
    href: '/guias/software-inventario-pymes-quito/',
  },
];

function FooterIcon({ type }: { type: 'email' | 'whatsapp' | 'instagram' }) {
  if (type === 'email') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-.4 4.25-7.07 4.42a1 1 0 0 1-1.06 0L4.4 8.25V6.7l7.6 4.75 7.6-4.75v1.55Z" />
      </svg>
    );
  }

  if (type === 'instagram') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M16 3.2A12.7 12.7 0 0 0 5 22.3L3.4 28.8l6.7-1.6A12.8 12.8 0 1 0 16 3.2Zm0 23.1c-2 0-4-.6-5.7-1.7l-.4-.2-4 .9.9-3.9-.3-.4a10.4 10.4 0 1 1 9.5 5.3Zm5.8-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.3 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

export function Footer({ content }: FooterProps) {
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label === 'WhatsApp',
  );
  const emailChannel = content.contact.channels.find(
    (channel) => channel.label === 'Email',
  );
  const instagramChannel = content.contact.channels.find(
    (channel) => channel.label === 'Instagram',
  );
  const whatsappHref = `${
    whatsappChannel?.href ?? 'https://wa.me/593963092859'
  }?text=${encodeURIComponent(
    'Hola Maiatesta, vi su web y quiero cotizar una solución digital para mi negocio en Quito.',
  )}`;

  return (
    <footer className="site-footer" aria-labelledby="footer-brand">
      <div className="site-footer__main">
        <section className="site-footer__brand">
          <p className="site-footer__eyebrow">Quito · Pichincha · Ecuador</p>
          <strong id="footer-brand">{content.footer.headline}</strong>
          <p>{content.footer.body}</p>
          <div className="site-footer__cta-row">
            <a
              className="site-footer__cta"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              Cotizar por WhatsApp
            </a>
            <a className="site-footer__text-link" href="/guias/">
              Ver guías
            </a>
          </div>
        </section>

        <nav className="site-footer__nav" aria-label="Servicios">
          <h2>Servicios</h2>
          {content.products.map((product) => {
            const serviceSlug = getServiceSlugForProductId(product.id);

            if (!serviceSlug) {
              return null;
            }

            return (
              <a href={`/servicios/${serviceSlug}/`} key={product.id}>
                {product.title}
              </a>
            );
          })}
        </nav>

        <nav className="site-footer__nav" aria-label="Recursos">
          <h2>Recursos</h2>
          <a href="/guias/">Todas las guías</a>
          {featuredGuideLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <section className="site-footer__contact" aria-label="Contacto">
          <h2>Contacto</h2>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            {whatsappChannel?.value ?? '+593 963 092 859'}
          </a>
          <a href={emailChannel?.href ?? 'mailto:maiatesta@gmail.com'}>
            {emailChannel?.value ?? 'maiatesta@gmail.com'}
          </a>
          <div className="site-footer__socials" aria-label="Redes y canales">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Contactar a Maiatesta por WhatsApp"
            >
              <FooterIcon type="whatsapp" />
            </a>
            <a
              href={emailChannel?.href ?? 'mailto:ventas@maiatesta.com'}
              aria-label="Enviar email a Maiatesta"
            >
              <FooterIcon type="email" />
            </a>
            {instagramChannel ? (
              <a
                href={instagramChannel.href}
                target="_blank"
                rel="noreferrer"
                aria-label="Ver Instagram de Maiatesta"
              >
                <FooterIcon type="instagram" />
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className="site-footer__bottom">
        <span>
          {new Date().getFullYear()} {content.footer.rights}
        </span>
        <a href="/sitemap.xml">Sitemap</a>
      </div>
    </footer>
  );
}
