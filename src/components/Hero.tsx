import { useRef } from 'react';
import { siteContent } from '../data/siteContent';
import type { LanguageCode, LocalizedContent } from '../data/siteContent';
import type { PaletteName } from '../hooks/usePaletteSync';
import { trackWhatsAppClick } from '../utils/analytics';
import { Header } from './Header';
import { LuminousText } from './LuminousText';
import { PersonaPortrait } from './PersonaPortrait';
import { TypingText } from './TypingText';

const heroHighlightPhrases = [
  'Quito small businesses',
  'Websites',
  'automation',
  'pymes de Quito',
  'Páginas web',
  'automatización',
];

type HeroProps = {
  content: LocalizedContent;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  isPersonaPortraitAligned: boolean;
  onPersonaPortraitToggle: () => void;
  palette: PaletteName;
};

const typedPhrases: Record<LanguageCode, string[]> = {
  es: [
    'páginas web que convierten.',
    'automatizaciones que ahorran tiempo.',
    'software que ordena tu operación.',
  ],
  en: [
    'websites that convert.',
    'automations that save time.',
    'software that brings clarity.',
  ],
};

/** Full-page hero with a fixed SEO headline, lightweight typing effect and photographic space composition. */
export function Hero({
  content,
  language,
  onLanguageChange,
  isPersonaPortraitAligned,
  onPersonaPortraitToggle,
  palette,
}: HeroProps) {
  const personaButtonRef = useRef<HTMLDivElement>(null);
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label.toLowerCase() === 'whatsapp',
  );

  return (
    <section className='hero-section' id='top'>
      <div className='hero-shooting-stars' aria-hidden='true'>
        <span className='hero-shooting-star hero-shooting-star--a' />
        <span className='hero-shooting-star hero-shooting-star--b' />
        <span className='hero-shooting-star hero-shooting-star--c' />
      </div>
      <div className='hero-scrim' />
      <Header
        content={content}
        language={language}
        onLanguageChange={onLanguageChange}
      />
      <div className='hero-content'>
        <div className='hero-copy reveal'>
          <p className='eyebrow'>{content.hero.eyebrow}</p>
          <h1>
            <LuminousText
              text={content.hero.title}
              phrases={heroHighlightPhrases}
            />
          </h1>
          <p className='hero-typing-line'>
            <span>{language === 'es' ? 'Creamos' : 'We build'}</span>
            <TypingText phrases={typedPhrases[language]} />
          </p>
          <p className='hero-body'>{content.hero.body}</p>
          <div className='hero-actions'>
            <a
              className='button button-primary'
              href={whatsappChannel?.href ?? '#contact'}
              target={whatsappChannel ? '_blank' : undefined}
              rel={whatsappChannel ? 'noreferrer' : undefined}
              onClick={() => trackWhatsAppClick({ ctaLocation: 'hero', pageType: 'home' })}
            >
              {content.hero.primaryCta}
            </a>
            <a className='button button-secondary' href='#services'>
              {content.hero.secondaryCta}
            </a>
          </div>
          <ul className='hero-proof' aria-label={language === 'es' ? 'Capacidades' : 'Capabilities'}>
            <li>
              <strong>01</strong>
              <span>Web</span>
            </li>
            <li>
              <strong>02</strong>
              <span>{language === 'es' ? 'Automatización' : 'Automation'}</span>
            </li>
            <li>
              <strong>03</strong>
              <span>Software</span>
            </li>
          </ul>
        </div>

        <div
          className={`hero-cosmos reveal${isPersonaPortraitAligned ? ' is-aligned' : ''}`}
          style={{ animationDelay: '120ms' }}
        >
          <div className='hero-cosmos__coordinates' aria-hidden='true'>
            <span>00° 13′ S</span>
            <span>78° 31′ W</span>
          </div>
          <div className='hero-cosmos__orbit hero-cosmos__orbit--outer' aria-hidden='true' />
          <div className='hero-cosmos__orbit hero-cosmos__orbit--inner' aria-hidden='true' />
          <div className='hero-cosmos__sun' aria-hidden='true'>
            <img
              className='hero-cosmos__solar-media'
              src='/assets/cosmic/solar-orb-900.avif'
              alt=''
              width='900'
              height='684'
              decoding='async'
            />
          </div>
          <div className='hero-cosmos__persona'>
            <PersonaPortrait
              ref={personaButtonRef}
              image={siteContent.brand.persona}
              alt={siteContent.brand.personaAlt}
              isAligned={isPersonaPortraitAligned}
              isMirrored={palette === 'current'}
              onToggle={onPersonaPortraitToggle}
            />
          </div>
          <span className='hero-cosmos__satellite hero-cosmos__satellite--a' aria-hidden='true' />
          <span className='hero-cosmos__satellite hero-cosmos__satellite--b' aria-hidden='true' />
          <div className='hero-cosmos__label' aria-hidden='true'>
            <span>{language === 'es' ? 'Señal activa' : 'Signal active'}</span>
            <strong>MAIATESTA / 2026</strong>
          </div>
          <button
            className='hero-persona-cta'
            type='button'
            aria-pressed={isPersonaPortraitAligned}
            onClick={() => personaButtonRef.current?.click()}
          >
            <span aria-hidden='true'>↻</span>
            {isPersonaPortraitAligned
              ? language === 'es'
                ? 'Modo cósmico activo'
                : 'Cosmic mode active'
              : language === 'es'
                ? 'Haz clic: gira y cambia el color'
                : 'Click: rotate and change color'}
          </button>
        </div>
      </div>
      <a className='scroll-cta' href='#services' aria-label='Scroll down to services'>
        <span className='scroll-cta__label'>{content.hero.secondaryCta}</span>
        <span className='scroll-cta__track' aria-hidden='true'>
          <span className='scroll-cta__dot' />
        </span>
        <span className='scroll-cta__arrow' aria-hidden='true'>
          <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
            <path d='M8 2v12M3 9l5 5 5-5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
          </svg>
        </span>
      </a>
    </section>
  );
}
