import { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';

type WhatsappConnectPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

type ConnectStatus = 'idle' | 'connecting' | 'success' | 'cancelled' | 'error';

// Only 'idle' is reachable in this phase. The other states are wired up so a
// future FB.login() integration can drive this same button without a redesign.
const connectStatusLabel: Record<ConnectStatus, string> = {
  idle: 'Conectar con Meta',
  connecting: 'Abriendo Meta...',
  success: 'WhatsApp autorizado correctamente',
  cancelled: 'La configuración fue cancelada',
  error: 'No fue posible completar la configuración',
};

export function WhatsappConnectPage({
  language,
  onLanguageChange,
}: WhatsappConnectPageProps) {
  const content = siteContent.locales.es;
  const [status] = useState<ConnectStatus>('idle');

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
            <p className='eyebrow'>WhatsApp Business</p>
            <h1>Conectar WhatsApp Business</h1>
            <p className='hero-body'>
              Esta herramienta permitirá conectar de forma segura una cuenta de WhatsApp Business con la
              plataforma de Maiatesta mediante los servicios oficiales de Meta.
            </p>
          </div>
        </div>
      </section>

      <main className='service-page-main'>
        <section className='section legal-content'>
          <aside className='service-proof-card reveal'>
            <span>Aviso de seguridad</span>
            <p>
              Las autorizaciones se realizarán directamente mediante Meta. Maiatesta no solicitará la
              contraseña de Facebook o Meta del usuario.
            </p>
          </aside>

          <div className='hero-actions'>
            {/* NOTE for the next phase: replace `disabled` with an onClick that
                calls FB.login(...) and drives `status` through connecting/success/
                cancelled/error. No Meta SDK, App ID, or network calls belong here yet. */}
            <button type='button' className='button button-primary' disabled aria-disabled='true'>
              {connectStatusLabel[status]}
            </button>
          </div>
          <p className='hero-body'>
            La conexión con Meta será habilitada una vez terminada la configuración técnica.
          </p>
        </section>
      </main>

      <Footer content={content} />
    </div>
  );
}
