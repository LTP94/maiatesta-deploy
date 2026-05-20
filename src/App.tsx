import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Hero } from './components/Hero';
import { ScrollConstellation } from './components/ScrollConstellation';
import { siteContent } from './data/siteContent';
import type { LanguageCode, LocalizedContent } from './data/siteContent';
import { normalizeArticlePath } from './data/articleRoutes';
import { normalizeServicePath } from './data/serviceRoutes';
import { useScrollReveal } from './hooks/useScrollReveal';

// Non-critical UI is split away from the hero bundle.
const loadStarsBackground = () =>
  import('./components/StarsBackground').then((m) => ({ default: m.StarsBackground }));
const loadTypebotStandardChat = () =>
  import('./components/TypebotStandardChat').then((m) => ({ default: m.TypebotStandardChat }));
const loadProductRoulette = () =>
  import('./components/ProductRoulette').then((m) => ({ default: m.ProductRoulette }));
const loadProjects = () =>
  import('./components/Projects').then((m) => ({ default: m.Projects }));
const loadMilkyWayDivider = () =>
  import('./components/MilkyWayDivider').then((m) => ({ default: m.MilkyWayDivider }));
const loadLocalFaq = () =>
  import('./components/LocalFaq').then((m) => ({ default: m.LocalFaq }));
const loadContactForm = () =>
  import('./components/ContactForm').then((m) => ({ default: m.ContactForm }));
const loadGuidesTeaser = () =>
  import('./components/GuidesTeaser').then((m) => ({ default: m.GuidesTeaser }));
const loadFooter = () =>
  import('./components/Footer').then((m) => ({ default: m.Footer }));
const loadStickyWhatsAppButton = () =>
  import('./components/StickyWhatsAppButton').then((m) => ({ default: m.StickyWhatsAppButton }));
const loadServiceLandingPage = () =>
  import('./components/ServiceLandingPage').then((m) => ({ default: m.ServiceLandingPage }));
const loadArticleLandingPage = () =>
  import('./components/ArticleLandingPage').then((m) => ({ default: m.ArticleLandingPage }));
const loadGuidesIndexPage = () =>
  import('./components/GuidesIndexPage').then((m) => ({ default: m.GuidesIndexPage }));

const StarsBackground     = lazy(loadStarsBackground);
const TypebotStandardChat = lazy(loadTypebotStandardChat);
const ProductRoulette     = lazy(loadProductRoulette);
const Projects             = lazy(loadProjects);
const MilkyWayDivider      = lazy(loadMilkyWayDivider);
const LocalFaq             = lazy(loadLocalFaq);
const ContactForm          = lazy(loadContactForm);
const GuidesTeaser         = lazy(loadGuidesTeaser);
const Footer               = lazy(loadFooter);
const StickyWhatsAppButton = lazy(loadStickyWhatsAppButton);
const ServiceLandingPage   = lazy(loadServiceLandingPage);
const ArticleLandingPage   = lazy(loadArticleLandingPage);
const GuidesIndexPage      = lazy(loadGuidesIndexPage);

const localChunkPreloaders = [
  loadProductRoulette,
  loadProjects,
  loadMilkyWayDivider,
  loadLocalFaq,
  loadGuidesTeaser,
  loadContactForm,
  loadFooter,
  loadStickyWhatsAppButton,
];

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

function isConstrainedConnection() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  return (
    connection?.saveData === true ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
  );
}

function scheduleWhenIdle(callback: () => void, timeout: number) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(timeoutId);
}

function TypebotFallback({ content }: { content: LocalizedContent }) {
  return (
    <section className='site-main-typebot-chat scroll-fallback' aria-label='Kipux chat'>
      <div className='bot-invite'>
        <p className='bot-invite__eyebrow'>{content.bot.eyebrow}</p>
        <h2 className='bot-invite__title'>{content.bot.title}</h2>
        <p className='bot-invite__body'>{content.bot.body}</p>
      </div>
    </section>
  );
}

function ContactFallback({ content }: { content: LocalizedContent }) {
  return (
    <section id='contact' className='section contact-section scroll-fallback' aria-busy='true'>
      <div className='contact-copy'>
        <p className='eyebrow'>{content.contact.eyebrow}</p>
        <h2>{content.contact.title}</h2>
        <p>{content.contact.body}</p>
      </div>
    </section>
  );
}

function RouteFallback({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className='app-shell service-page-shell' data-palette='atlantic'>
      <section className='service-page-hero' id='top'>
        <div className='hero-scrim' />
        <div className='service-page-hero__inner'>
          <div className='service-page-copy'>
            <p className='eyebrow'>{eyebrow}</p>
            <h1>{title}</h1>
            <p className='hero-body'>{body}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

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

function getInitialRoutePath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

type AppProps = {
  routePath?: string;
};

export default function App({ routePath }: AppProps) {
  // Estados globales de la interfaz: idioma, tema de color y estado de scroll.
  // Always start with 'es' to match SSR output; detect browser language in useEffect.
  const [language, setLanguage] = useState<LanguageCode>('es');
  const isInteractiveLangChange = useRef(false);
  const [palette, setPalette] = useState<PaletteName>(getInitialPalette);
  const [isPersonaPortraitAligned, setIsPersonaPortraitAligned] =
    useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasScrolledRef = useRef(false);
  const [shouldShowScrollConstellation, setShouldShowScrollConstellation] =
    useState(false);
  const content = useMemo(() => siteContent.locales[language], [language]);
  const currentRoutePath = routePath ?? getInitialRoutePath();
  const serviceSlug = normalizeServicePath(currentRoutePath);
  const articleSlug = normalizeArticlePath(currentRoutePath);
  const isGuidesIndexRoute =
    currentRoutePath === '/guias' || currentRoutePath === '/guias/';
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

  // Warm local lazy chunks only when the browser has breathing room. Mobile and
  // constrained networks keep the first scroll smooth instead of downloading all
  // below-fold chunks immediately after hydration.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isConstrainedConnection()) {
      return;
    }

    let didPreload = false;
    let cancelIdlePreload = () => {};

    const preloadLocalChunks = () => {
      if (didPreload) {
        return;
      }

      didPreload = true;
      localChunkPreloaders.forEach((preloadChunk) => {
        void preloadChunk();
      });
    };

    const queuePreload = () => {
      if (didPreload) {
        return;
      }

      cancelIdlePreload();
      cancelIdlePreload = scheduleWhenIdle(preloadLocalChunks, 4200);
    };

    const isSmallViewport = window.innerWidth <= 620;

    if (!isSmallViewport) {
      const desktopWarmupId = window.setTimeout(preloadLocalChunks, 650);
      return () => window.clearTimeout(desktopWarmupId);
    }

    const interactionOptions: AddEventListenerOptions = {
      once: true,
      passive: true,
    };

    queuePreload();
    window.addEventListener('scroll', queuePreload, interactionOptions);
    window.addEventListener('pointerdown', queuePreload, interactionOptions);
    window.addEventListener('keydown', queuePreload, { once: true });

    return () => {
      cancelIdlePreload();
      window.removeEventListener('scroll', queuePreload);
      window.removeEventListener('pointerdown', queuePreload);
      window.removeEventListener('keydown', queuePreload);
    };
  }, []);

  // The scroll constellation is decorative and expensive on phones. Mount it
  // only where there is enough space to benefit from it.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1536px)');
    const syncConstellationVisibility = () => {
      setShouldShowScrollConstellation(mediaQuery.matches);
    };

    syncConstellationVisibility();
    mediaQuery.addEventListener('change', syncConstellationVisibility);

    return () => {
      mediaQuery.removeEventListener('change', syncConstellationVisibility);
    };
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
      const nextHasScrolled = window.scrollY > 12;
      if (hasScrolledRef.current === nextHasScrolled) {
        return;
      }

      hasScrolledRef.current = nextHasScrolled;
      setHasScrolled(nextHasScrolled);
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

  if (serviceSlug) {
    return (
      <Suspense
        fallback={
          <RouteFallback
            eyebrow='Servicio local'
            title='Servicios digitales para pymes en Quito.'
            body='Cargando la página de servicio de Maiatesta.'
          />
        }
      >
        <ServiceLandingPage
          slug={serviceSlug}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </Suspense>
    );
  }

  if (articleSlug) {
    return (
      <Suspense
        fallback={
          <RouteFallback
            eyebrow='Guía local'
            title='Guías SEO para pymes en Quito.'
            body='Cargando la guía de Maiatesta.'
          />
        }
      >
        <ArticleLandingPage
          slug={articleSlug}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </Suspense>
    );
  }

  if (isGuidesIndexRoute) {
    return (
      <Suspense
        fallback={
          <RouteFallback
            eyebrow='Guías Maiatesta'
            title='Guías prácticas para negocios en Quito.'
            body='Cargando recursos de Maiatesta.'
          />
        }
      >
        <GuidesIndexPage
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </Suspense>
    );
  }

  return (
    // data-palette alimenta las variables CSS que cambian la identidad visual.
    <div
      className={hasScrolled ? 'app-shell is-scrolled' : 'app-shell'}
      data-palette={palette}
    >
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
      {shouldShowScrollConstellation ? <ScrollConstellation /> : null}
      <Hero
        content={content}
        language={language}
        onLanguageChange={handleLanguageChange}
        isPersonaPortraitAligned={isPersonaPortraitAligned}
        onPersonaPortraitToggle={handlePersonaPortraitToggle}
        palette={palette}
      />
      <div className={hasScrolled ? 'site-main is-scrolled' : 'site-main'}>
        <Suspense fallback={<TypebotFallback content={content} />}>
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
            <MilkyWayDivider />
          </Suspense>
          <Suspense fallback={null}>
            <LocalFaq content={content} />
          </Suspense>
          <Suspense fallback={null}>
            <GuidesTeaser />
          </Suspense>
          <Suspense fallback={<ContactFallback content={content} />}>
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
