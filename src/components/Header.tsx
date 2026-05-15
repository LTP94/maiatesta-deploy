import { useState } from "react";
import { siteContent } from "../data/siteContent";
import type { LanguageCode, LocalizedContent } from "../data/siteContent";

type HeaderProps = {
  content: LocalizedContent;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

export function Header({ content, language, onLanguageChange }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const whatsappChannel = content.contact.channels.find(
    (channel) => channel.label.toLowerCase() === 'whatsapp',
  );

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`site-header${isMenuOpen ? ' menu-open' : ''}`}>
      <a className="brand-mark" href="#top" aria-label={siteContent.brand.name} onClick={closeMenu}>
        <img src={siteContent.brand.logo} alt={siteContent.brand.logoAlt} decoding="async" fetchPriority="high" />
      </a>
      <nav className="nav-links" aria-label={content.ariaLabels.primaryNavigation}>
        {content.nav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="header-controls">
        <div className="language-switcher" aria-label={content.ariaLabels.languageSwitcher}>
          {siteContent.languageSwitcher.options.map((option) => (
            <button
              className={language === option.code ? "language-option active" : "language-option"}
              key={option.code}
              type="button"
              onClick={() => onLanguageChange(option.code)}
              aria-pressed={language === option.code}
            >
              {option.label}
            </button>
          ))}
        </div>
        <a
          className="header-action"
          href={whatsappChannel?.href ?? "#contact"}
          target={whatsappChannel ? "_blank" : undefined}
          rel={whatsappChannel ? "noreferrer" : undefined}
          onClick={closeMenu}
        >
          {content.hero.primaryCta}
        </a>
        <button
          className={`hamburger-btn${isMenuOpen ? ' is-open' : ''}`}
          type="button"
          aria-expanded={isMenuOpen}
          aria-label="Menu"
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
      {isMenuOpen && (
        <nav className="mobile-nav" aria-label={content.ariaLabels.primaryNavigation}>
          {content.nav.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a
            className="mobile-nav-cta"
            href={whatsappChannel?.href ?? "#contact"}
            target={whatsappChannel ? "_blank" : undefined}
            rel={whatsappChannel ? "noreferrer" : undefined}
            onClick={closeMenu}
          >
            {content.hero.primaryCta}
          </a>
        </nav>
      )}
    </header>
  );
}
