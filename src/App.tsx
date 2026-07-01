import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ClientLogos } from './components/ClientLogos';
import { Hero } from './components/Hero';
import { LegalPage } from './components/LegalPage';
import { ScrollConstellation } from './components/ScrollConstellation';
import { siteContent } from './data/siteContent';
import type { LanguageCode } from './data/siteContent';
import { normalizeArticlePath } from './data/articleRoutes';
import { normalizeLegalPath } from './data/legalRoutes';
import { normalizePillarPath } from './data/pillarRoutes';
import { normalizeServicePath } from './data/serviceRoutes';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useScrollActivity } from './hooks/useScrollActivity';
import { useSectionHydration } from './hooks/useSectionHydration';
import { useScrollConstellation } from './hooks/useScrollConstellation';
import { usePaletteSync } from './hooks/usePaletteSync';
import type { PaletteName } from './hooks/usePaletteSync';
import { useHashNavigation } from './hooks/useHashNavigation';
import { useScrolled } from './hooks/useScrolled';
import {
  TypebotFallback,
  ContactFallback,
  RouteFallback,
  ServicesShell,
  ProjectsShell,
  FaqShell,
} from './components/Shells';

export type { PaletteName };

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

const StarsBackground      = lazy(loadStarsBackground);
const TypebotStandardChat  = lazy(loadTypebotStandardChat);
const ProductRoulette      = lazy(loadProductRoulette);
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
  // Always start with 'es' to match SSR output; detect browser language in useEffect.
  const [language, setLanguage] = useState<LanguageCode>('es');
  const isInteractiveLangChange = useRef(false);
  const [palette, setPalette] = useState<PaletteName>(getInitialPalette);
  const [isPersonaPortraitAligned, setIsPersonaPortraitAligned] = useState(false);
  const scrollingRef = useRef(false);
  const flickingRef = useRef(false);

  const content = useMemo(() => siteContent.locales[language], [language]);
  const currentRoutePath = routePath ?? getInitialRoutePath();
  const serviceSlug = normalizeServicePath(currentRoutePath);
  const articleSlug = normalizeArticlePath(currentRoutePath);
  const pillarSlug = normalizePillarPath(currentRoutePath);
  const legalSlug = normalizeLegalPath(currentRoutePath);
  const isGuidesIndexRoute =
    currentRoutePath === '/guias' || currentRoutePath === '/guias/';

  useScrollReveal(language);
  useScrollActivity(scrollingRef, flickingRef);
  const hydratedSections = useSectionHydration(
    scrollingRef,
    flickingRef,
    gatedSectionPreloaders,
    sectionChunkPreloaders,
  );
  const shouldShowScrollConstellation = useScrollConstellation();
  usePaletteSync(palette, savePaletteChoice);
  useHashNavigation(language, isInteractiveLangChange);
  const hasScrolled = useScrolled();

  // Sincroniza el atributo lang del documento para accesibilidad y SEO.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }, [language]);

  // Detect browser language once after hydration to avoid SSR/client mismatch.
  useEffect(() => {
    const detected = getInitialLanguage();
    if (detected !== 'es') setLanguage(detected);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    isInteractiveLangChange.current = true;
    setLanguage(lang);
  };

  const handlePersonaPortraitToggle = () => {
    setIsPersonaPortraitAligned((current) => {
      const next = !current;
      setPalette(next ? 'current' : 'atlantic');
      return next;
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

  if (legalSlug) {
    return (
      <LegalPage
        slug={legalSlug}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  if (pillarSlug) {
    return (
      <Suspense
        fallback={
          <RouteFallback
            eyebrow='Servicio local'
            title='Desarrollo de software en Quito.'
            body='Cargando la página de Maiatesta.'
          />
        }
      >
        <ServiceLandingPage
          slug={pillarSlug}
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
      <ClientLogos content={content} />
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
