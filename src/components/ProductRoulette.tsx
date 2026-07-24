import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { siteContent } from '../data/siteContent';
import type { LocalizedContent } from '../data/siteContent';
import { getServiceSlugForProductId } from '../data/serviceRoutes';
import type { PaletteName } from '../App';
import { LuminousText } from './LuminousText';
import { ServicePreview } from './ServicePreview';

const servicesHighlightPhrases = [
  'SMEs in Quito',
  'Accessible digital services',
  'pymes en Quito',
  'Servicios digitales accesibles',
];

const cardAutoRotateMs = 4500;

function ProcessIcon({ step }: { step: number }) {
  const style = { display: 'block', width: 28, height: 28, marginBottom: 6 };
  const stroke = 'var(--app-copper, #D6A85A)';

  if (step === 0) {
    return (
      <svg viewBox="0 0 48 48" style={style} aria-hidden="true">
        <path d="M18 14 C10 18 10 30 18 34" fill="none" stroke={stroke} strokeWidth="2" opacity="0.6"/>
        <path d="M26 18 Q32 24 26 30" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
        <path d="M32 20 Q36 24 32 28" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.3"/>
      </svg>
    );
  }

  if (step === 1) {
    return (
      <svg viewBox="0 0 48 48" style={style} aria-hidden="true">
        <path d="M12 14 L36 14 L28 24 L28 34 L20 34 L20 24 Z" fill="none" stroke={stroke} strokeWidth="2" opacity="0.5"/>
        <path d="M24 36 L24 40" stroke={stroke} strokeWidth="1.5" opacity="0.35"/>
        <circle cx="24" cy="42" r="1.5" fill={stroke} opacity="0.3"/>
      </svg>
    );
  }

  if (step === 2) {
    return (
      <svg viewBox="0 0 48 48" style={style} aria-hidden="true">
        <rect x="10" y="26" width="12" height="12" rx="2" fill="none" stroke={stroke} strokeWidth="2" opacity="0.5"/>
        <rect x="26" y="18" width="12" height="20" rx="2" fill="none" stroke={stroke} strokeWidth="2" opacity="0.6"/>
        <rect x="18" y="10" width="12" height="12" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" style={style} aria-hidden="true">
      <path d="M16 32 L30 12" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M26 12 L30 12 L30 16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M14 34 C14 34 10 30 12 26" stroke={stroke} strokeWidth="1.2" opacity="0.3" fill="none"/>
      <path d="M16 36 C16 36 12 34 10 30" stroke={stroke} strokeWidth="1" opacity="0.2" fill="none"/>
    </svg>
  );
}

type ProductRouletteProps = {
  content: LocalizedContent;
  palette: PaletteName;
  onPaletteChange: (palette: PaletteName) => void;
};

// Cambia esto a true si quieres mostrar el selector de paleta en la pagina.
// Cambialo a false si quieres ocultarlo y controlar la paleta solo desde App.tsx.
const showPaletteSwitcher = false;

const paletteOptions = [
  {
    id: 'current',
    colors: ['#070707', '#ffb38a', '#c9ef55', '#e2ded8'],
  },
  {
    id: 'atlantic',
    colors: ['#F6F8FB', '#07111F', '#6F8FAF', '#D8BD78'],
  },
  {
    id: 'tropical',
    colors: ['#2FA4D7', '#E76F2E', '#F5E9D8', '#3E2C23'],
  },
  {
    id: 'sunset',
    colors: ['#FF9A86', '#FFF0BE', '#FFD6A6', '#FFB399'],
  },
  {
    id: 'sand',
    colors: ['#170C79', '#EFE3CA', '#56B6C6', '#8ACBD0'],
  },
] satisfies Array<{
  id: PaletteName;
  colors: string[];
}>;

// Para editar el tamano visual de la ruleta, revisa tambien estas clases en deferred.css:
// .service-carousel controla el espacio total; .service-scene el escenario 3D;
// .service-card el ancho/alto de cada tarjeta; .service-card-preview la imagen web.
/** 3-D service carousel and palette switcher. Cards rotate on a CSS 3D axis; clicking a card changes the active palette. */
export function ProductRoulette({
  content,
  palette,
  onPaletteChange,
}: ProductRouletteProps) {
  const services = content.products;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Initialize to 1024 (matches SSR) to avoid hydration mismatch.
  // The useEffect reads the real width after hydration.
  const [windowWidth, setWindowWidth] = useState(1024);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cellCount = services.length;
  const isMobileViewport = windowWidth <= 620;
  // Tamano base usado para calcular la separacion circular entre tarjetas.
  // Se reduce en movil para que la ruleta quepa en pantallas estrechas.
  const cellSize = windowWidth <= 390 ? 220 : windowWidth <= 620 ? 260 : 400;
  // Angulo entre tarjetas: se reparte el circulo completo entre todos los servicios.
  const theta = cellCount > 0 ? 360 / cellCount : 0;
  // Radio de la ruleta 3D. Un numero mayor separa mas las tarjetas del centro.
  const radius =
    cellCount > 1
      ? Math.round(cellSize / 1.7 / Math.tan(Math.PI / cellCount))
      : 0;
  const safeActiveIndex = cellCount > 0 ? activeIndex % cellCount : 0;
  const activeProduct = services[safeActiveIndex];
  const previousIndex =
    cellCount > 0 ? (safeActiveIndex - 1 + cellCount) % cellCount : 0;
  const nextIndex = cellCount > 0 ? (safeActiveIndex + 1) % cellCount : 0;
  const previousProduct = services[previousIndex];
  const nextProduct = services[nextIndex];

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    index: number,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    setActiveIndex(index);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [services]);

  // Rotacion automatica de cartas. 4500ms deja tiempo para leer titulo, texto y frase final.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isPaused || cellCount < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % cellCount);
    }, cardAutoRotateMs);

    return () => window.clearInterval(intervalId);
  }, [cellCount, isPaused]);

  return (
    <section className='section services-section' id='services'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.sections.services.eyebrow}</p>
        <h2>
          <LuminousText
            text={content.sections.services.title}
            phrases={servicesHighlightPhrases}
          />
        </h2>
        <p>{content.sections.services.body}</p>
      </div>
      <div
        className='roulette-layout'
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        <div className='service-carousel scroll-reveal'>
          {/* Contenedor visual de la ruleta; su tamano externo esta en .service-carousel. */}
          <div className='service-scene'>
            <div className='service-axis'>
              <div
                className='service-deck'
                style={{
                  // translateZ usa el radio calculado para ubicar el carrusel en profundidad.
                  transform: isMobileViewport
                    ? 'translateZ(0) rotateY(0deg)'
                    : `translateZ(${-radius}px) rotateY(${
                        -safeActiveIndex * theta
                      }deg)`,
                }}
                aria-label={content.sections.services.title}
              >
                {services.map((service, index) => {
                  if (isMobileViewport && index !== safeActiveIndex) {
                    return null;
                  }

                  const angle = theta * index;
                  const servicePageSlug = getServiceSlugForProductId(service.id);

                  return (
                    // Cada tarjeta se ubica en el circulo con rotateY + translateZ(radius).
                    // Para cambiar su tamano manualmente, edita .service-card en deferred.css
                    // y luego ajusta cellSize arriba para mantener la separacion correcta.
                    <article
                      className={
                        index === safeActiveIndex
                          ? 'service-card active'
                          : 'service-card'
                      }
                      key={service.id}
                      style={
                        {
                          // El radio define cuanto se aleja cada tarjeta del centro de la ruleta.
                          transform: isMobileViewport
                            ? 'translateZ(0) rotateY(0deg)'
                            : `rotateY(${angle}deg) translateZ(${radius}px)`,
                        } as CSSProperties
                      }
                      onClick={() => setActiveIndex(index)}
                      onKeyDown={(event) => handleCardKeyDown(event, index)}
                      aria-label={service.title}
                      aria-current={index === safeActiveIndex}
                      tabIndex={0}
                    >
                      <span className='service-card-index'>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3>{service.title}</h3>
                      <p>
                        <span>{service.description}</span>
                        {service.previewUrl ||
                        service.previewImage ||
                        service.previewVideoMp4 ||
                        service.previewVideoWebm ? (
                          <ServicePreview
                            href={service.previewUrl}
                            image={service.previewImage}
                            alt={service.previewAlt}
                            title={service.title}
                            isActive={index === safeActiveIndex}
                            videoMp4={service.previewVideoMp4}
                            videoWebm={service.previewVideoWebm}
                          />
                        ) : null}
                      </p>
                      <strong>{service.accent}</strong>
                      {servicePageSlug ? (
                        <a
                          className='service-page-link'
                          href={`/servicios/${servicePageSlug}/`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Ver servicio
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
          {cellCount > 1 && previousProduct ? (
            <button
              className='service-side-hotspot service-side-hotspot--previous'
              type='button'
              onClick={() => setActiveIndex(previousIndex)}
              aria-label={`Seleccionar ${previousProduct.title}`}
            />
          ) : null}
          {cellCount > 1 && nextProduct ? (
            <button
              className='service-side-hotspot service-side-hotspot--next'
              type='button'
              onClick={() => setActiveIndex(nextIndex)}
              aria-label={`Seleccionar ${nextProduct.title}`}
            />
          ) : null}
          <div className='service-orbit-shadow' aria-hidden='true' />
          {activeProduct ? (
            <p className='service-active-summary'>{activeProduct.accent}</p>
          ) : null}
          <div
            className='service-indicators'
            aria-label={content.sections.services.title}
          >
            {services.map((service, index) => (
              <button
                className={
                  index === safeActiveIndex
                    ? 'service-indicator active'
                    : 'service-indicator'
                }
                key={service.id}
                type='button'
                onClick={() => setActiveIndex(index)}
                aria-label={service.title}
                aria-pressed={index === safeActiveIndex}
              />
            ))}
          </div>
        </div>
        <div className='process-block'>
          <h3 className='process-title scroll-reveal'>
            {content.processTitle}
          </h3>
          <div className='process-list'>
            {content.process.map((step, index) => (
              <article className='scroll-reveal' key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <ProcessIcon step={index} />
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
