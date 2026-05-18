import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Hero } from './components/Hero';
import { ProductRoulette } from './components/ProductRoulette';
import { ScrollConstellation } from './components/ScrollConstellation';
import { siteContent } from './data/siteContent';
import type { LanguageCode, LocalizedContent } from './data/siteContent';
import { useScrollReveal } from './hooks/useScrollReveal';

// Non-critical UI is split away from the hero bundle.
const loadStarsBackground = () =>
  import('./components/StarsBackground').then((m) => ({ default: m.StarsBackground }));
const loadTypebotStandardChat = () =>
  import('./components/TypebotStandardChat').then((m) => ({ default: m.TypebotStandardChat }));
const loadProjects = () =>
  import('./components/Projects').then((m) => ({ default: m.Projects }));
const loadLuminescentBanner = () =>
  import('./components/LuminescentBanner').then((m) => ({ default: m.LuminescentBanner }));
const loadLocalFaq = () =>
  import('./components/LocalFaq').then((m) => ({ default: m.LocalFaq }));
const loadContactForm = () =>
  import('./components/ContactForm').then((m) => ({ default: m.ContactForm }));
const loadFooter = () =>
  import('./components/Footer').then((m) => ({ default: m.Footer }));
const loadStickyWhatsAppButton = () =>
  import('./components/StickyWhatsAppButton').then((m) => ({ default: m.StickyWhatsAppButton }));

const StarsBackground     = lazy(loadStarsBackground);
const TypebotStandardChat = lazy(loadTypebotStandardChat);
const Projects             = lazy(loadProjects);
const LuminescentBanner    = lazy(loadLuminescentBanner);
const LocalFaq             = lazy(loadLocalFaq);
const ContactForm          = lazy(loadContactForm);
const Footer               = lazy(loadFooter);
const StickyWhatsAppButton = lazy(loadStickyWhatsAppButton);

const localChunkPreloaders = [
  loadStarsBackground,
  loadTypebotStandardChat,
  loadProjects,
  loadLuminescentBanner,
  loadLocalFaq,
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

function SectionFallback({
  id,
  className,
  eyebrow,
  title,
  body,
}: {
  id?: string;
  className: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section
      id={id}
      className={`section ${className} scroll-fallback`}
      aria-busy='true'
    >
      <div className='section-heading'>
        <p className='eyebrow'>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
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
      <div className='contact-form' aria-hidden='true'>
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function FooterFallback({ content }: { content: LocalizedContent }) {
  return (
    <footer className='site-footer scroll-fallback' aria-busy='true'>
      <div>
        <strong>{siteContent.brand.name}</strong>
        <p>{content.footer.body}</p>
      </div>
    </footer>
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

  // Warm local lazy chunks shortly after first paint so fast scrolling does not
  // wait on section JS. The external Typebot CDN still loads only after click.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const preloadLocalChunks = () => {
      if (cancelled) {
        return;
      }

      localChunkPreloaders.forEach((preloadChunk) => {
        void preloadChunk();
      });
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preloadLocalChunks, {
        timeout: 1800,
      });

      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(preloadLocalChunks, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
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
        <Suspense fallback={<TypebotFallback content={content} />}>
          <TypebotStandardChat content={content} />
        </Suspense>
        {/* Composicion principal de la pagina: servicios, proyectos y contacto. */}
        <main>
          <ProductRoulette
            content={content}
            palette={palette}
            onPaletteChange={setPalette}
          />
          <Suspense
            fallback={
              <SectionFallback
                id='projects'
                className='projects-section'
                eyebrow={content.sections.projects.eyebrow}
                title={content.sections.projects.title}
                body={content.sections.projects.body}
              />
            }
          >
            <Projects content={content} />
          </Suspense>
          <Suspense
            fallback={
              <SectionFallback
                className='luminescent-banner silver'
                eyebrow={content.banners[1].eyebrow}
                title={content.banners[1].title}
                body={content.banners[1].body}
              />
            }
          >
            <LuminescentBanner {...content.banners[1]} tone='silver' />
          </Suspense>
          <Suspense
            fallback={
              <SectionFallback
                id='local-faq'
                className='local-faq-section'
                eyebrow={content.faqs.eyebrow}
                title={content.faqs.title}
                body={content.faqs.body}
              />
            }
          >
            <LocalFaq content={content} />
          </Suspense>
          <Suspense fallback={<ContactFallback content={content} />}>
            <ContactForm content={content} />
          </Suspense>
        </main>
        <Suspense fallback={<FooterFallback content={content} />}>
          <Footer content={content} />
        </Suspense>
        <Suspense fallback={null}>
          <StickyWhatsAppButton content={content} />
        </Suspense>
      </div>
    </div>
  );
}
