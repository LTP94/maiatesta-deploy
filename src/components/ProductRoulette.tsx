import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { siteContent } from '../data/siteContent';
import type { LocalizedContent } from '../data/siteContent';
import type { PaletteName } from '../App';
import { LuminousText } from './LuminousText';
import { ServicePreview } from './ServicePreview';

const servicesHighlightPhrases = [
  'SMEs in Quito',
  'Accessible digital services',
  'pymes en Quito',
  'Servicios digitales accesibles',
];

type ProductRouletteProps = {
  content: LocalizedContent;
  palette: PaletteName;
  onPaletteChange: (palette: PaletteName) => void;
};

// Cambia esto a true si quieres mostrar el selector de paleta en la pagina.
// Cambialo a false si quieres ocultarlo y controlar la paleta solo desde App.tsx.
const showPaletteSwitcher = true;

const paletteOptions = [
  {
    id: 'current',
    colors: ['#070707', '#ffb38a', '#c9ef55', '#e2ded8'],
  },
  {
    id: 'atlantic',
    colors: ['#E8EDF2', '#2C3947', '#547A95', '#C2A56D'],
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

  // Rotacion automatica de cartas. Cambia 1500 para acelerar o reducir la velocidad.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isPaused || cellCount < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % cellCount);
    }, 1500);

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
                  transform: `translateZ(${-radius}px) rotateY(${
                    -safeActiveIndex * theta
                  }deg)`,
                }}
                aria-label={content.sections.services.title}
              >
                {services.map((service, index) => {
                  const angle = theta * index;

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
                          transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
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
                        {service.previewUrl ? (
                          <ServicePreview
                            href={service.previewUrl}
                            image={service.previewImage}
                            alt={service.previewAlt}
                            title={service.title}
                            isActive={index === safeActiveIndex}
                          />
                        ) : null}
                      </p>
                      <strong>{service.accent}</strong>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
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
