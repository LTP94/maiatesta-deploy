import { siteContent } from "../data/siteContent";
import type { LanguageCode, LocalizedContent } from "../data/siteContent";

type HeaderProps = {
  content: LocalizedContent;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
};

export function Header({ content, language, onLanguageChange }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand-mark" href="#top" aria-label={siteContent.brand.name}>
        <img src={siteContent.brand.logo} alt={siteContent.brand.logoAlt} />
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
        <a className="header-action" href="#contact">
          {content.hero.primaryCta}
        </a>
      </div>
    </header>
  );
}
