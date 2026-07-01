import { siteContent } from '../data/siteContent';
import type { LanguageCode, LocalizedContent } from '../data/siteContent';
import { trackWhatsAppClick } from '../utils/analytics';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Header } from './Header';
import { HeroVideoBackground } from './HeroVideoBackground';
import { LuminousText } from './LuminousText';
import { PersonaPortrait } from './PersonaPortrait';

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
  isPersonaPortraitAligned: boolean;
  onLanguageChange: (language: LanguageCode) => void;
  onPersonaPortraitToggle: () => void;
  palette: string;
};

/** Full-page hero section: renders the Header, luminous headline, persona portrait and scroll CTA. */
export function Hero({
  content,
  language,
  isPersonaPortraitAligned,
  onLanguageChange,
  onPersonaPortraitToggle,
  palette,
}: HeroProps) {
  const isDesktop = useMediaQuery('(min-width: 769px)');
  const personaImage =
    palette === 'atlantic'
      ? siteContent.brand.atlanticPersona
      : siteContent.brand.persona;
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label.toLowerCase() === 'whatsapp',
  );

  return (
    <section className='hero-section' id='top'>
      {isDesktop && <HeroVideoBackground />}
      {/* CSS background layers — hidden on mobile via media query in hero-effects.css */}
      <div className='hero-stars hero-stars--far' aria-hidden='true' />
      <div className='hero-stars hero-stars--near' aria-hidden='true' />
      <div className='hero-aurora' aria-hidden='true' />
      <div className='hero-orbs' aria-hidden='true'>
        <div className='hero-orb hero-orb--a' />
        <div className='hero-orb hero-orb--b' />
        <div className='hero-orb hero-orb--c' />
        <div className='hero-orb hero-orb--d' />
      </div>
      <div className='hero-shooting-stars' aria-hidden='true'>
        <span className='hero-shooting-star hero-shooting-star--a' />
        <span className='hero-shooting-star hero-shooting-star--b' />
        <span className='hero-shooting-star hero-shooting-star--c' />
      </div>
      <div className='hero-grain' aria-hidden='true' />
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
        </div>
        <div
          className='persona-panel reveal'
          style={{ animationDelay: '120ms' }}
        >
          <PersonaPortrait
            image={personaImage}
            alt={siteContent.brand.personaAlt}
            isAligned={isPersonaPortraitAligned}
            isMirrored={palette === 'atlantic'}
            onToggle={onPersonaPortraitToggle}
          />
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
