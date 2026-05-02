import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LocalizedContent } from '../data/siteContent';

type ProductRouletteProps = {
  content: LocalizedContent;
};

export function ProductRoulette({ content }: ProductRouletteProps) {
  const services = content.products;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const cellCount = services.length;
  const cellSize = 240;
  const theta = 360 / cellCount;
  const radius = Math.round(cellSize / 2 / Math.tan(Math.PI / cellCount));
  const activeProduct = services[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [services]);

  useEffect(() => {
    if (isPaused || cellCount < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % cellCount);
    }, 3600);

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
              className='service-deck'
              style={{
                transform: `translateZ(${-radius}px) rotateY(${
                  -activeIndex * theta
                }deg)`,
              }}
              aria-label={content.sections.services.title}
            >
              {services.map((service, index) => {
                const angle = theta * index;

                return (
                  <button
                    className={
                      index === activeIndex
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
                    aria-pressed={index === activeIndex}
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
          <div className='service-orbit-shadow' aria-hidden='true' />
          <p className='service-active-summary'>{activeProduct.accent}</p>
          <div
            className='service-indicators'
            aria-label={content.sections.services.title}
          >
            {services.map((service, index) => (
              <button
                className={
                  index === activeIndex
                    ? 'service-indicator active'
                    : 'service-indicator'
                }
                key={service.id}
                type='button'
                onClick={() => setActiveIndex(index)}
                aria-label={service.title}
                aria-pressed={index === activeIndex}
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
