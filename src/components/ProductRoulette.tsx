import { useEffect, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { LocalizedContent } from '../data/siteContent';

type ProductRouletteProps = {
  content: LocalizedContent;
};

export function ProductRoulette({ content }: ProductRouletteProps) {
  const products = content.products;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pointerMotion, setPointerMotion] = useState({
    x: 0,
    y: 0,
    shiftX: 150,
    shiftY: 0,
  });
  const activeProduct = products[activeIndex];

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setPointerMotion({
      x: Number((x * 12).toFixed(2)),
      y: Number((y * -12).toFixed(2)),
      shiftX: Number((x * 18).toFixed(2)),
      shiftY: Number((y * 18).toFixed(2)),
    });
  };

  const resetPointerMotion = () => {
    setPointerMotion({ x: 0, y: 0, shiftX: 0, shiftY: 0 });
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [products]);

  useEffect(() => {
    if (isPaused || products.length < 5) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % products.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [isPaused, products.length]);

  return (
    <section className='section services-section' id='services'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.sections.services.eyebrow}</p>
        <h2>{content.sections.services.title}</h2>
        <p>{content.sections.services.body}</p>
      </div>
      <div
        className='roulette-layout'
        onPointerEnter={() => setIsPaused(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setIsPaused(false);
          resetPointerMotion();
        }}
        onFocus={() => setIsPaused(true)}
        onBlur={() => {
          setIsPaused(false);
          resetPointerMotion();
        }}
      >
        <div
          className='service-carousel scroll-reveal'
          style={
            {
              '--carousel-tilt-x': `${pointerMotion.y}deg`,
              '--carousel-tilt-y': `${pointerMotion.x}deg`,
              '--carousel-shift-x': `${pointerMotion.shiftX}px`,
              '--carousel-shift-y': `${pointerMotion.shiftY}px`,
            } as CSSProperties
          }
        >
          <div
            className='service-deck'
            aria-label={content.sections.services.title}
          >
            {products.map((product, index) =>
              (() => {
                const wrappedOffset =
                  (index - activeIndex + products.length) % products.length;
                const offset =
                  wrappedOffset > products.length / 2
                    ? wrappedOffset - products.length
                    : wrappedOffset;
                const distance = Math.min(Math.abs(offset), 3);

                return (
                  <button
                    className={
                      index === activeIndex
                        ? 'service-card active'
                        : 'service-card'
                    }
                    key={product.id}
                    style={
                      {
                        '--card-offset': offset,
                        '--card-distance': distance,
                        '--card-scale': 1 - distance * 0.1,
                        '--card-opacity': 1 - distance * 0.16,
                        zIndex: 20 - distance,
                      } as CSSProperties
                    }
                    type='button'
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={index === activeIndex}
                    aria-label={product.title}
                  >
                    <span className='service-card-index'>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    <strong>{product.accent}</strong>
                  </button>
                );
              })(),
            )}
          </div>
          <div className='service-orbit-shadow' aria-hidden='true' />
          <p className='service-active-summary'>{activeProduct.accent}</p>
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
