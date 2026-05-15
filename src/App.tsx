import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Hero } from './components/Hero';
import { ScrollConstellation } from './components/ScrollConstellation';

// Non-critical UI is split away from the hero bundle.
const StarsBackground     = lazy(() => import('./components/StarsBackground').then(m => ({ default: m.StarsBackground })));
const TypebotStandardChat = lazy(() => import('./components/TypebotStandardChat').then(m => ({ default: m.TypebotStandardChat })));
const ProductRoulette      = lazy(() => import('./components/ProductRoulette').then(m => ({ default: m.ProductRoulette })));
const Projects             = lazy(() => import('./components/Projects').then(m => ({ default: m.Projects })));
const LuminescentBanner    = lazy(() => import('./components/LuminescentBanner').then(m => ({ default: m.LuminescentBanner })));
const LocalFaq             = lazy(() => import('./components/LocalFaq').then(m => ({ default: m.LocalFaq })));
const ContactForm          = lazy(() => import('./components/ContactForm').then(m => ({ default: m.ContactForm })));
const Footer               = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));
const StickyWhatsAppButton = lazy(() => import('./components/StickyWhatsAppButton').then(m => ({ default: m.StickyWhatsAppButton })));
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
  if (typeof window === 'undefined') {
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
  // Always start with 'es' to match SSR output; detect browser language in useEffect.
  const [language, setLanguage] = useState<LanguageCode>('es');
  const isInteractiveLangChange = useRef(false);
  const [palette, setPalette] = useState<PaletteName>(getInitialPalette);
  const [isPersonaPortraitAligned, setIsPersonaPortraitAligned] =
    useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const content = useMemo(() => siteContent.locales[language], [language]);
  useScrollReveal(language);

  // Sincroniza el atributo lang del documento para accesibilidad y SEO.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language;
  }, [language]);

  // Detect browser language once after hydration to avoid SSR/client mismatch.
  useEffect(() => {
    const detected = getInitialLanguage();
    if (detected !== 'es') setLanguage(detected);
  }, []);

  // Guarda la paleta elegida para que se mantenga al recargar la pagina.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!savePaletteChoice) {
      return;
    }

    window.localStorage.setItem('maiatesta-palette', palette);
  }, [palette]);

  // Si la URL tiene hash, espera a que el layout se estabilice y mueve la vista al destino.
  // Omite el scroll cuando el cambio de idioma es interactivo (no recarga de pagina).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

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
    if (typeof window === 'undefined') {
      return;
    }

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
      <Suspense fallback={null}>
        <StarsBackground />
      </Suspense>
      {/* Shooting stars that traverse the entire viewport */}
      <div className='page-meteors' aria-hidden='true'>
        <span className='page-meteor page-meteor--a' />
        <span className='page-meteor page-meteor--b' />
        <span className='page-meteor page-meteor--c' />
        <span className='page-meteor page-meteor--d' />
      </div>
      {/* Space scroll constellation — right-side comet + section nodes */}
      <ScrollConstellation />
      <Hero
        content={content}
        language={language}
        onLanguageChange={handleLanguageChange}
        isPersonaPortraitAligned={isPersonaPortraitAligned}
        onPersonaPortraitToggle={handlePersonaPortraitToggle}
        palette={palette}
      />
      <div className={hasScrolled ? 'site-main is-scrolled' : 'site-main'}>
        <Suspense fallback={null}>
          <TypebotStandardChat content={content} />
        </Suspense>
        {/* Composicion principal de la pagina: servicios, proyectos y contacto. */}
        <main>
          <Suspense fallback={null}>
            <ProductRoulette
              content={content}
              palette={palette}
              onPaletteChange={setPalette}
            />
          </Suspense>
          <Suspense fallback={null}>
            <Projects content={content} />
          </Suspense>
          <Suspense fallback={null}>
            <LuminescentBanner {...content.banners[1]} tone='silver' />
          </Suspense>
          <Suspense fallback={null}>
            <LocalFaq content={content} />
          </Suspense>
          <Suspense fallback={null}>
            <ContactForm content={content} />
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <Footer content={content} />
        </Suspense>
        <Suspense fallback={null}>
          <StickyWhatsAppButton content={content} />
        </Suspense>
      </div>
    </div>
  );
}
