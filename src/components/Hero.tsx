import { siteContent } from "../data/siteContent";
import type { LanguageCode, LocalizedContent } from "../data/siteContent";
import { Header } from "./Header";
import { PersonaPortrait } from "./PersonaPortrait";

type HeroProps = {
  content: LocalizedContent;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

export function Hero({ content, language, onLanguageChange }: HeroProps) {
  return (
    <section className="hero-section" id="top">
      <video
        className="hero-video"
        src={siteContent.brand.heroVideo}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="hero-scrim" />
      <Header content={content} language={language} onLanguageChange={onLanguageChange} />
      <div className="hero-content">
        <div className="hero-copy reveal">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>{content.hero.title}</h1>
          <p className="hero-body">{content.hero.body}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">
              {content.hero.primaryCta}
            </a>
            <a className="button button-secondary" href="#services">
              {content.hero.secondaryCta}
            </a>
          </div>
        </div>
        <div className="persona-panel reveal" style={{ animationDelay: "120ms" }}>
          <PersonaPortrait image={siteContent.brand.persona} alt={siteContent.brand.personaAlt} />
          <div className="persona-signal">
            {content.hero.metrics.map((metric) => (
              <span key={metric.label}>
                <strong>{metric.value}</strong>
                {metric.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
