import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

const gatedSectionPreloaders = [
  { selector: '#services', preload: loadProductRoulette },
  { selector: '#projects', preload: loadProjects },
  { selector: '#local-faq', preload: loadLocalFaq },
] satisfies Array<{ selector: string; preload: () => Promise<unknown> }>;

const sectionChunkPreloaders = [
  { selector: '.milky-way-divider', preload: loadMilkyWayDivider },
  { selector: '.guides-teaser-section', preload: loadGuidesTeaser },
  { selector: '#contact', preload: loadContactForm },
  { selector: '.site-footer', preload: loadFooter },
  { selector: '.sticky-whatsapp-button', preload: loadStickyWhatsAppButton },
] satisfies Array<{ selector: string; preload: () => Promise<unknown> }>;

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

type ScrollActivityDetail = {
  isScrolling: boolean;
  isFlicking: boolean;
  velocity: number;
};

function emitScrollActivity(
  isScrolling: boolean,
  isFlicking = false,
  velocity = 0,
) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('is-scrolling', isScrolling);
  document.documentElement.classList.toggle('is-flicking', isFlicking);
  document.dispatchEvent(
    new CustomEvent('maiatesta:scroll-activity', {
      detail: { isScrolling, isFlicking, velocity } satisfies ScrollActivityDetail,
    }),
  );
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

function SectionShellHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className='section-heading scroll-reveal'>
      <p className='eyebrow'>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function ServicesShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section services-section section-hydration-shell section-shell--services'
      id='services'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.sections.services.eyebrow}
        title={content.sections.services.title}
        body={content.sections.services.body}
      />
      <div className='roulette-layout'>
        <div className='service-carousel scroll-reveal'>
          <div className='service-shell-card' aria-hidden='true'>
            <span className='service-card-index'>01</span>
            <span className='service-card-preview'>
              <span className='service-preview-frame'>
                <span className='service-preview-skeleton' aria-hidden='true' />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectsShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section projects-section section-hydration-shell section-shell--projects'
      id='projects'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.sections.projects.eyebrow}
        title={content.sections.projects.title}
        body={content.sections.projects.body}
      />
      <div className='project-grid'>
        {[0, 1, 2].map((index) => (
          <article
            className='project-card section-shell-card scroll-reveal'
            key={index}
            aria-hidden='true'
          />
        ))}
      </div>
    </section>
  );
}

function FaqShell({ content }: { content: LocalizedContent }) {
  return (
    <section
      className='section local-faq-section section-hydration-shell section-shell--faq'
      id='local-faq'
      aria-busy='true'
    >
      <SectionShellHeading
        eyebrow={content.faqs.eyebrow}
        title={content.faqs.title}
        body={content.faqs.body}
      />
      <div className='local-faq-grid'>
        {[0, 1, 2].map((index) => (
          <article
            className='local-faq-item section-shell-card scroll-reveal'
            key={index}
            aria-hidden='true'
          />
        ))}
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
  const scrollingRef = useRef(false);
  const flickingRef = useRef(false);
  const pendingHydrationSelectors = useRef(new Set<string>());
  const [shouldShowScrollConstellation, setShouldShowScrollConstellation] =
    useState(false);
  const [hydratedSections, setHydratedSections] = useState<Set<string>>(
    () => new Set(),
  );
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

  // Pauses decorative motion while the user is actively scrolling or swiping.
  // This keeps the visual system intact at rest without making fast mobile
  // scrolling compete with animation work.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let rafId = 0;
    let idleTimeoutId = 0;
    let isScrolling = false;
    let isFlicking = false;
    let lastY = window.scrollY;
    let lastTs = performance.now();
    const flickThreshold = window.innerWidth <= 920 ? 1.35 : 2.2;

    const setScrollState = (
      nextScrolling: boolean,
      nextFlicking: boolean,
      velocity = 0,
    ) => {
      if (isScrolling === nextScrolling && isFlicking === nextFlicking) {
        return;
      }

      isScrolling = nextScrolling;
      isFlicking = nextFlicking;
      scrollingRef.current = nextScrolling;
      flickingRef.current = nextFlicking;
      emitScrollActivity(nextScrolling, nextFlicking, velocity);
    };

    const markScrolling = () => {
      scrollingRef.current = true;

      if (rafId === 0) {
        rafId = window.requestAnimationFrame((now) => {
          rafId = 0;
          const nextY = window.scrollY;
          const deltaMs = Math.max(16, now - lastTs);
          const velocity = Math.abs(nextY - lastY) / deltaMs;

          lastY = nextY;
          lastTs = now;
          setScrollState(true, velocity >= flickThreshold, velocity);
        });
      }

      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(() => {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        lastY = window.scrollY;
        lastTs = performance.now();
        setScrollState(false, false, 0);
      }, 150);
    };

    const options: AddEventListenerOptions = { passive: true };

    window.addEventListener('scroll', markScrolling, options);
    window.addEventListener('touchmove', markScrolling, options);
    window.addEventListener('wheel', markScrolling, options);

    return () => {
      window.removeEventListener('scroll', markScrolling);
      window.removeEventListener('touchmove', markScrolling);
      window.removeEventListener('wheel', markScrolling);
      window.clearTimeout(idleTimeoutId);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      scrollingRef.current = false;
      flickingRef.current = false;
      emitScrollActivity(false, false, 0);
    };
  }, []);

  // Preloads local lazy chunks far before their sections enter the viewport,
  // but defers expensive section hydration during high-velocity flicks.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const loaded = new Set<string>();
    const pendingSelectors = pendingHydrationSelectors.current;
    let hydrationSettleTimeout = 0;

    const preload = (selector: string, loader: () => Promise<unknown>) => {
      if (loaded.has(selector)) return;
      loaded.add(selector);
      void loader();
    };

    const isNearViewport = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      return (
        rect.bottom > -viewportHeight * 0.35 &&
        rect.top < viewportHeight * 1.35
      );
    };

    const activateSection = (selector: string) => {
      const target = document.querySelector(selector);

      const shouldWaitForIdle = scrollingRef.current;

      if (
        !target ||
        !isNearViewport(target) ||
        flickingRef.current ||
        shouldWaitForIdle
      ) {
        pendingSelectors.add(selector);
        return;
      }

      pendingSelectors.delete(selector);

      startTransition(() => {
        setHydratedSections((currentSections) => {
          if (currentSections.has(selector)) {
            return currentSections;
          }

          const nextSections = new Set(currentSections);
          nextSections.add(selector);
          return nextSections;
        });
      });
    };

    const processPendingHydration = () => {
      pendingSelectors.forEach((selector) => {
        const match = gatedSectionPreloaders.find(
          (item) => item.selector === selector,
        );

        if (match) {
          activateSection(match.selector);
        }
      });
    };

    const handleScrollActivity = (
      event: Event,
    ) => {
      const customEvent = event as CustomEvent<ScrollActivityDetail>;
      if (!customEvent.detail?.isScrolling && !customEvent.detail?.isFlicking) {
        window.clearTimeout(hydrationSettleTimeout);
        hydrationSettleTimeout = window.setTimeout(
          processPendingHydration,
          720,
        );
      }
    };

    document.addEventListener('maiatesta:scroll-activity', handleScrollActivity);

    if (!('IntersectionObserver' in window)) {
      gatedSectionPreloaders.forEach(({ selector }) => {
        activateSection(selector);
      });
      sectionChunkPreloaders.forEach(({ selector, preload: loader }) => {
        preload(selector, loader);
      });
      return () => {
        window.clearTimeout(hydrationSettleTimeout);
        document.removeEventListener(
          'maiatesta:scroll-activity',
          handleScrollActivity,
        );
      };
    }

    const preloadDistanceMultiplier = window.innerWidth >= 1024 ? 16 : 3;
    const preloadDistancePx = Math.ceil(
      window.innerHeight * preloadDistanceMultiplier,
    );
    const hydrationDistancePx = 0;

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const match = sectionChunkPreloaders.find(({ selector }) =>
            entry.target.matches(selector),
          );

          if (!match) return;
          preload(match.selector, match.preload);
          preloadObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: `${preloadDistancePx}px 0px`,
        threshold: 0,
      },
    );

    const hydrationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const match = gatedSectionPreloaders.find(({ selector }) =>
            entry.target.matches(selector),
          );

          if (!match) return;

          if (flickingRef.current) {
            pendingSelectors.add(match.selector);
            return;
          }

          activateSection(match.selector);
        });
      },
      {
        root: null,
        rootMargin: `${hydrationDistancePx}px 0px`,
        threshold: 0,
      },
    );

    gatedSectionPreloaders.forEach(({ selector }) => {
      const target = document.querySelector(selector);

      if (target) {
        hydrationObserver.observe(target);
        return;
      }

      window.requestAnimationFrame(() => {
        const lateTarget = document.querySelector(selector);
        if (lateTarget) hydrationObserver.observe(lateTarget);
        else activateSection(selector);
      });
    });

    sectionChunkPreloaders.forEach(({ selector, preload: loader }) => {
      const target = document.querySelector(selector);

      if (target) {
        preloadObserver.observe(target);
        return;
      }

      window.requestAnimationFrame(() => {
        const lateTarget = document.querySelector(selector);
        if (lateTarget) preloadObserver.observe(lateTarget);
        else preload(selector, loader);
      });
    });

    return () => {
      window.clearTimeout(hydrationSettleTimeout);
      document.removeEventListener(
        'maiatesta:scroll-activity',
        handleScrollActivity,
      );
      preloadObserver.disconnect();
      hydrationObserver.disconnect();
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
          {hydratedSections.has('#services') ? (
            <Suspense fallback={<ServicesShell content={content} />}>
              <ProductRoulette
                content={content}
                palette={palette}
                onPaletteChange={setPalette}
              />
            </Suspense>
          ) : (
            <ServicesShell content={content} />
          )}
          {hydratedSections.has('#projects') ? (
            <Suspense fallback={<ProjectsShell content={content} />}>
              <Projects content={content} />
            </Suspense>
          ) : (
            <ProjectsShell content={content} />
          )}
          <Suspense fallback={null}>
            <MilkyWayDivider />
          </Suspense>
          {hydratedSections.has('#local-faq') ? (
            <Suspense fallback={<FaqShell content={content} />}>
              <LocalFaq content={content} />
            </Suspense>
          ) : (
            <FaqShell content={content} />
          )}
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
