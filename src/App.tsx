import { useEffect, useMemo, useRef, useState } from 'react';
import { ContactForm } from './components/ContactForm';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { LuminescentBanner } from './components/LuminescentBanner';
import { ProductRoulette } from './components/ProductRoulette';
import { Projects } from './components/Projects';
import { TypebotStandardChat } from './components/TypebotStandardChat';
import { siteContent } from './data/siteContent';
import type { LanguageCode } from './data/siteContent';
import { useScrollReveal } from './hooks/useScrollReveal';

export type PaletteName =
  | 'current'
  | 'atlantic'
  | 'tropical'
  | 'sunset'
  | 'sand';

// Elige aqui la paleta principal de la web cuando quieres controlarla desde codigo.
const defaultPalette: PaletteName = 'atlantic';

// Cambia esto a true si quieres que el navegador recuerde la ultima paleta elegida.
// En false, la web siempre usa defaultPalette al cargar.
const savePaletteChoice = false;

// Detecta el idioma inicial del navegador y limita la app a los idiomas disponibles.
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

// Recupera la paleta guardada para conservar la preferencia visual del usuario.
function getInitialPalette(): PaletteName {
  if (typeof window === 'undefined' || !savePaletteChoice) {
    return defaultPalette;
  }

  const storedPalette = window.localStorage.getItem('maiatesta-palette');

  return storedPalette === 'atlantic' ||
    storedPalette === 'tropical' ||
    storedPalette === 'sunset' ||
    storedPalette === 'sand'
    ? storedPalette
    : defaultPalette;
}

export default function App() {
  // Estados globales de la interfaz: idioma, tema de color y estado de scroll.
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const isInteractiveLangChange = useRef(false);
  const [palette, setPalette] = useState<PaletteName>(getInitialPalette);
  const [isPersonaPortraitAligned, setIsPersonaPortraitAligned] =
    useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const content = useMemo(() => siteContent.locales[language], [language]);
  useScrollReveal(language);

  // Sincroniza el atributo lang del documento para accesibilidad y SEO.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Guarda la paleta elegida para que se mantenga al recargar la pagina.
  useEffect(() => {
    if (!savePaletteChoice) {
      return;
    }

    window.localStorage.setItem('maiatesta-palette', palette);
  }, [palette]);

  // Si la URL tiene hash, espera a que el layout se estabilice y mueve la vista al destino.
  // Omite el scroll cuando el cambio de idioma es interactivo (no recarga de pagina).
  useEffect(() => {
    if (isInteractiveLangChange.current) {
      isInteractiveLangChange.current = false;
      return;
    }

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

  // Activa una clase despues de iniciar el scroll para intensificar el fondo principal.
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    isInteractiveLangChange.current = true;
    setLanguage(lang);
  };

  const handlePersonaPortraitToggle = () => {
    setIsPersonaPortraitAligned((currentValue) => {
      const nextValue = !currentValue;

      setPalette(nextValue ? 'current' : 'atlantic');

      return nextValue;
    });
  };

  return (
    // data-palette alimenta las variables CSS que cambian la identidad visual.
    <div className='app-shell' data-palette={palette}>
      <Hero
        content={content}
        language={language}
        onLanguageChange={handleLanguageChange}
        isPersonaPortraitAligned={isPersonaPortraitAligned}
        onPersonaPortraitToggle={handlePersonaPortraitToggle}
        palette={palette}
      />
      <div className={hasScrolled ? 'site-main is-scrolled' : 'site-main'}>
        {/* Video ambiental de fondo para las secciones posteriores al hero. */}
        <video
          className='site-main-video'
          src={siteContent.brand.pageBackgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden='true'
        />
        <TypebotStandardChat content={content} />
        {/* Composicion principal de la pagina: servicios, proyectos y contacto. */}
        <main>
          <ProductRoulette
            content={content}
            palette={palette}
            onPaletteChange={setPalette}
          />
          <Projects content={content} />
          <LuminescentBanner {...content.banners[1]} tone='silver' />
          <ContactForm content={content} />
        </main>
        <Footer content={content} />
      </div>
    </div>
  );
}
