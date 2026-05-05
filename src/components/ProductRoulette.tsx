import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { siteContent } from '../data/siteContent';
import type { LocalizedContent } from '../data/siteContent';
import type { PaletteName } from '../App';
import { LuminousText } from './LuminousText';
import { SectionBackground } from './SectionBackground';

const servicesHighlightPhrases = [
  'grow and monetize your business',
  'crecer y rentabilizar tu negocio',
  'Technology',
  'Tecnología',
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

const AXIS_MIN_Z = -5;
const AXIS_MAX_Z = 5;
const AXIS_MIN_X = -20;
const AXIS_MAX_X = -10;
const AXIS_Z_STEP = 0.015;
const AXIS_X_STEP = 0.01;
const AXIS_INTERVAL_MS = 10;

// Para editar el tamano visual de la ruleta, revisa tambien estas clases en styles.css:
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
  const [axisZ, setAxisZ] = useState(0);
  const [axisX, setAxisX] = useState(-15);
  const axisZDirection = useRef(1);
  const axisXDirection = useRef(1);
  const cellCount = services.length;
  // Tamano base usado para calcular la separacion circular entre tarjetas.
  // Si haces las tarjetas mas grandes en CSS, sube este valor para abrir la ruleta.
  const cellSize = 400;
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

  // Movimiento suave del eje completo: da una inclinacion viva sin cambiar la tarjeta activa.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setAxisZ((prev) => {
        const next = prev + AXIS_Z_STEP * axisZDirection.current;

        if (next >= AXIS_MAX_Z) {
          axisZDirection.current = -1;
          return AXIS_MAX_Z;
        }

        if (next <= AXIS_MIN_Z) {
          axisZDirection.current = 1;
          return AXIS_MIN_Z;
        }

        return Number(next.toFixed(2));
      });

      setAxisX((prev) => {
        const next = prev + AXIS_X_STEP * axisXDirection.current;

        if (next >= AXIS_MAX_X) {
          axisXDirection.current = -1;
          return AXIS_MAX_X;
        }

        if (next <= AXIS_MIN_X) {
          axisXDirection.current = 1;
          return AXIS_MIN_X;
        }

        return Number(next.toFixed(2));
      });
    }, AXIS_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  // Rotacion automatica de cartas. Cambia 1500 para acelerar o reducir la velocidad.
  useEffect(() => {
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
      <SectionBackground
        src={siteContent.brand.sectionBackgroundVideos.services}
      />
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
            <div
              className='service-axis'
              style={{
                transform: `rotateX(${axisX}deg) rotateY(0deg) rotateZ(${axisZ}deg)`,
              }}
            >
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
                    // Para cambiar su tamano manualmente, edita .service-card en styles.css
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
                          // Preview clicable dentro del cuerpo del texto de la tarjeta.
                          <a
                            className='service-card-preview'
                            href={service.previewUrl}
                            target='_blank'
                            rel='noreferrer'
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`${service.title} preview`}
                          >
                            <span className='service-preview-bar'>
                              <span />
                              <span />
                              <span />
                            </span>
                            <iframe
                              src={service.previewUrl}
                              title={service.title}
                              tabIndex={-1}
                              loading='lazy'
                            />
                          </a>
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
              <article className='scroll-reveal' key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
