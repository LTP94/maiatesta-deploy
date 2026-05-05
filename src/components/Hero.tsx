import { siteContent } from '../data/siteContent';
import type { LanguageCode, LocalizedContent } from '../data/siteContent';
import { Header } from './Header';
import { LuminousText } from './LuminousText';
import { PersonaPortrait } from './PersonaPortrait';

const heroHighlightPhrases = [
  'increase sales',
  'automate operations',
  'improve decisions',
  'aumentan ventas',
  'automatizan operaciones',
  'mejoran decisiones',
];

type HeroProps = {
  content: LocalizedContent;
  language: LanguageCode;
  isPersonaPortraitAligned: boolean;
  onLanguageChange: (language: LanguageCode) => void;
  onPersonaPortraitToggle: () => void;
  palette: string;
};

export function Hero({
  content,
  language,
  isPersonaPortraitAligned,
  onLanguageChange,
  onPersonaPortraitToggle,
  palette,
}: HeroProps) {
  const personaImage =
    palette === 'atlantic'
      ? siteContent.brand.atlanticPersona
      : siteContent.brand.persona;
  return (
    <section className='hero-section' id='top'>
      <video
        className='hero-video'
        src={siteContent.brand.heroVideo}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden='true'
      />
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
            <a className='button button-primary' href='#contact'>
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
            onToggle={onPersonaPortraitToggle}
          />
        </div>
      </div>
      <a className='scroll-hint' href='#services' aria-label='Scroll down'>
        <span className='scroll-hint-mouse' aria-hidden='true' />
        <span className='scroll-hint-chevron' aria-hidden='true' />
        <span className='scroll-hint-chevron scroll-hint-chevron--2' aria-hidden='true' />
      </a>
    </section>
  );
}
