import { useEffect, useMemo, useState } from 'react';
import { ContactForm } from './components/ContactForm';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { LuminescentBanner } from './components/LuminescentBanner';
import { ProductRoulette } from './components/ProductRoulette';
import { Projects } from './components/Projects';
import { Reviews } from './components/Reviews';
import { siteContent } from './data/siteContent';
import type { LanguageCode } from './data/siteContent';
import { useScrollReveal } from './hooks/useScrollReveal';

export type PaletteName = 'current' | 'atlantic';

function getInitialLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') {
    return 'es';
  }

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const detectedLanguage = browserLanguages.find(
    (item) =>
      item.toLowerCase().startsWith('en') ||
      item.toLowerCase().startsWith('es'),
  );

  return detectedLanguage?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function getInitialPalette(): PaletteName {
  if (typeof window === 'undefined') {
    return 'current';
  }

  return window.localStorage.getItem('maiatesta-palette') === 'atlantic'
    ? 'atlantic'
    : 'current';
}

export default function App() {
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const [palette, setPalette] = useState<PaletteName>(getInitialPalette);
  const [hasScrolled, setHasScrolled] = useState(false);
  const content = useMemo(() => siteContent.locales[language], [language]);
  useScrollReveal(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem('maiatesta-palette', palette);
  }, [palette]);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const scrollToHash = () => {
      const target = document.querySelector(window.location.hash);

      if (!target) {
        return;
      }

      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY,
        behavior: 'auto',
      });
    };

    window.requestAnimationFrame(scrollToHash);
    const shortDelay = window.setTimeout(scrollToHash, 120);
    const layoutDelay = window.setTimeout(scrollToHash, 420);

    return () => {
      window.clearTimeout(shortDelay);
      window.clearTimeout(layoutDelay);
    };
  }, [language]);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='app-shell' data-palette={palette}>
      <Hero
        content={content}
        language={language}
        onLanguageChange={setLanguage}
      />
      <div className={hasScrolled ? 'site-main is-scrolled' : 'site-main'}>
        <video
          className='site-main-video'
          src={siteContent.brand.pageBackgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden='true'
        />
        <main>
          <ProductRoulette
            content={content}
            palette={palette}
            onPaletteChange={setPalette}
          />
          <Projects content={content} />
          <Reviews content={content} />
          <LuminescentBanner {...content.banners[1]} tone='silver' />
          <ContactForm content={content} />
        </main>
        <Footer content={content} />
      </div>
    </div>
  );
}
