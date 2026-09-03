import { Header } from './Header';
import { Footer } from './Footer';
import { siteContent } from '../data/siteContent';
import type { LanguageCode } from '../data/siteContent';
import { useWhatsappEmbeddedSignup } from '../hooks/useWhatsappEmbeddedSignup';
import type { SignupState } from '../utils/metaEmbeddedSignup';

type WhatsappConnectPageProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

const buttonLabel: Record<SignupState, string> = {
  SDK_LOADING: 'Cargando Meta...',
  SDK_READY: 'Conectar con Meta',
  WAITING_FOR_META: 'Esperando confirmación de Meta...',
  READY_FOR_BACKEND: 'Meta autorizó la conexión',
  WRONG_FLOW_VARIANT: 'Conectar con Meta',
  CANCELLED: 'Conectar con Meta',
  SDK_FAILED: 'Servicio de Meta no disponible',
  TIMED_OUT: 'Conectar con Meta',
  FAILED: 'Conectar con Meta',
};

const statusMessage: Partial<Record<SignupState, string>> = {
  WAITING_FOR_META: 'Completa el proceso en la ventana de Meta. Esta página se actualizará automáticamente.',
  READY_FOR_BACKEND:
    'Meta completó correctamente el proceso de autorización. La conexión con el servidor de Maiatesta se habilitará en la siguiente fase.',
  WRONG_FLOW_VARIANT: 'Meta no ofreció la opción esperada para tu cuenta. Puedes intentarlo nuevamente.',
  CANCELLED: 'La configuración fue cancelada. Puedes intentarlo nuevamente.',
  SDK_FAILED: 'No fue posible cargar los servicios de Meta. Recarga la página e inténtalo de nuevo.',
  TIMED_OUT: 'No recibimos confirmación de Meta a tiempo. Puedes intentarlo nuevamente.',
  FAILED: 'No fue posible completar la configuración. Puedes intentarlo nuevamente.',
};

export function WhatsappConnectPage({
  language,
  onLanguageChange,
}: WhatsappConnectPageProps) {
  const content = siteContent.locales.es;
  const { state, canConnect, connect } = useWhatsappEmbeddedSignup();
  const message = statusMessage[state];

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
            <button
              type='button'
              className='button button-primary'
              data-testid='whatsapp-connect-button'
              disabled={!canConnect}
              aria-disabled={!canConnect}
              onClick={connect}
            >
              {buttonLabel[state]}
            </button>
          </div>
          {message ? (
            <p className='form-status' role='status' aria-live='polite'>
              {message}
            </p>
          ) : null}
          <p className='hero-body'>
            Antes de conectar puedes consultar nuestra{' '}
            <a href='/politica-de-privacidad/'>Política de Privacidad</a> y nuestros{' '}
            <a href='/terminos/'>Términos de Servicio</a>.
          </p>
        </section>
      </main>

      <Footer content={content} />
    </div>
  );
}
