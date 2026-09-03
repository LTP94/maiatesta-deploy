import { Header } from './Header';
import { Footer } from './Footer';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';
import { useWhatsappEmbeddedSignup } from '../hooks/useWhatsappEmbeddedSignup';

type WhatsappConnectPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

export function WhatsappConnectPage({
  language,
  onLanguageChange,
}: WhatsappConnectPageProps) {
  const content = siteContent.locales[language];
  const { state, canConnect, connect } = useWhatsappEmbeddedSignup();
  const message = content.whatsappConnect.statusMessage[state];

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
          <div className='service-page-copy reveal'>
            <p className='eyebrow'>{content.whatsappConnect.eyebrow}</p>
            <h1>{content.whatsappConnect.title}</h1>
            <p className='hero-body'>{content.whatsappConnect.heroBody}</p>
          </div>
        </div>
      </section>

      <main className='service-page-main'>
        <section className='section legal-content'>
          <aside className='service-proof-card reveal'>
            <span>{content.whatsappConnect.securityNoticeLabel}</span>
            <p>{content.whatsappConnect.securityNoticeBody}</p>
          </aside>

          <div className='hero-actions'>
            <button
              type='button'
              className='button button-primary'
              data-testid='whatsapp-connect-button'
              disabled={!canConnect}
              aria-disabled={!canConnect}
              onClick={connect}
            >
              {content.whatsappConnect.buttonLabel[state]}
            </button>
          </div>
          {message ? (
            <p className='form-status' role='status' aria-live='polite'>
              {message}
            </p>
          ) : null}
          <p className='hero-body'>
            {content.whatsappConnect.beforeConnectPrefix}{' '}
            <a href='/politica-de-privacidad/'>{content.whatsappConnect.privacyPolicyLabel}</a>{' '}
            {content.whatsappConnect.beforeConnectMiddle}{' '}
            <a href='/terminos/'>{content.whatsappConnect.termsLabel}</a>.
          </p>
        </section>
      </main>

      <Footer content={content} language={language} />
    </div>
  );
}
