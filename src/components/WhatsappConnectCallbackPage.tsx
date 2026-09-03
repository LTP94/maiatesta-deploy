import { Header } from './Header';
import { Footer } from './Footer';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';

type WhatsappConnectCallbackPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

// Technical OAuth return URI reserved for a future Meta Facebook Login for
// Business "Valid OAuth Redirect URI" registration. Intentionally reads no
// query parameters, processes no authorization codes, and makes no network
// calls — see docs/meta-whatsapp-embedded-signup.md for the future flow.
export function WhatsappConnectCallbackPage({
  language,
  onLanguageChange,
}: WhatsappConnectCallbackPageProps) {
  const content = siteContent.locales[language];

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
            <h1>{content.whatsappConnect.callbackTitle}</h1>
            <p className='hero-body'>{content.whatsappConnect.callbackBody1}</p>
            <p className='hero-body'>{content.whatsappConnect.callbackBody2}</p>
          </div>
        </div>
      </section>

      <Footer content={content} language={language} />
    </div>
  );
}
