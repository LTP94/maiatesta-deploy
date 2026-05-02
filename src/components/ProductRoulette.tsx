import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LocalizedContent } from '../data/siteContent';

type ProductRouletteProps = {
  content: LocalizedContent;
};

const AXIS_MIN_Z = -5;
const AXIS_MAX_Z = 5;
const AXIS_MIN_X = -20;
const AXIS_MAX_X = -10;
const AXIS_Z_STEP = 0.015;
const AXIS_X_STEP = 0.01;
const AXIS_INTERVAL_MS = 10;

export function ProductRoulette({ content }: ProductRouletteProps) {
  const services = content.products;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [axisZ, setAxisZ] = useState(0);
  const [axisX, setAxisX] = useState(-15);
  const axisZDirection = useRef(1);
  const axisXDirection = useRef(1);
  const cellCount = services.length;
  const cellSize = 240;
  const theta = cellCount > 0 ? 360 / cellCount : 0;
  const radius =
    cellCount > 1
      ? Math.round(cellSize / 1.7 / Math.tan(Math.PI / cellCount))
      : 0;
  const safeActiveIndex = cellCount > 0 ? activeIndex % cellCount : 0;
  const activeProduct = services[safeActiveIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [services]);

  // movimiento suave en eje
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

  // rotacion de cartas
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
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.sections.services.eyebrow}</p>
        <h2>{content.sections.services.title}</h2>
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
                  transform: `translateZ(${-radius}px) rotateY(${
                    -safeActiveIndex * theta
                  }deg)`,
                }}
                aria-label={content.sections.services.title}
              >
                {services.map((service, index) => {
                  const angle = theta * index;

                  return (
                    <button
                      className={
                        index === safeActiveIndex
                          ? 'service-card active'
                          : 'service-card'
                      }
                      key={service.id}
                      style={
                        {
                          transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                        } as CSSProperties
                      }
                      type='button'
                      onClick={() => setActiveIndex(index)}
                      aria-label={service.title}
                      aria-pressed={index === safeActiveIndex}
                    >
                      <span className='service-card-index'>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <strong>{service.accent}</strong>
                    </button>
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
        <div className='process-list'>
          {content.process.map((step, index) => (
            <article className='scroll-reveal' key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
