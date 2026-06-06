import { useEffect, useRef, useState } from 'react';

/** Ambient looping video background for the hero section — desktop only.
 *  Skips loading if the user prefers reduced motion or is on a constrained network.
 *  Drop hero-bg.webm and hero-bg.mp4 into /public/assets/ to activate. */
export function HeroVideoBackground() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const isConstrained =
      connection?.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
    if (isConstrained) return;

    setShouldLoad(true);
  }, []);

  return (
    <div ref={hostRef} className='hero-video-bg' aria-hidden='true'>
      {shouldLoad ? (
        <>
          <video
            className={isReady ? 'hero-video-bg__media is-ready' : 'hero-video-bg__media'}
            autoPlay
            muted
            loop
            playsInline
            preload='metadata'
            poster='/assets/hero-poster.webp'
            onLoadedData={() => setIsReady(true)}
          >
            <source src='/assets/hero-bg.webm' type='video/webm' />
            <source src='/assets/hero-bg.mp4' type='video/mp4' />
          </video>
          <div className='hero-video-bg__overlay' />
        </>
      ) : null}
    </div>
  );
}
