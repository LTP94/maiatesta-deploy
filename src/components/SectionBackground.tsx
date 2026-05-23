import { useEffect, useRef, useState } from 'react';

type SectionBackgroundProps = {
  src: string;
};

/** Lazy-loaded ambient video background for landing page sections. Skips loading on reduced-motion, constrained networks, and viewports narrower than 1280 px. */
export function SectionBackground({ src }: SectionBackgroundProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection as
      | { saveData?: boolean; effectiveType?: string }
      | undefined;
    const isConstrainedNetwork =
      connection?.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
    const isSmallViewport = window.innerWidth < 1280;

    if (mediaQuery.matches || isConstrainedNetwork || isSmallViewport) {
      return;
    }

    setShouldRenderVideo(true);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const host = hostRef.current;

    if (!host || shouldLoad || !shouldRenderVideo) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(host);

    return () => observer.disconnect();
  }, [shouldLoad, shouldRenderVideo]);

  return (
    <div ref={hostRef} className='section-background-video'>
      {shouldLoad && shouldRenderVideo ? (
        <video
          className={
            isVideoReady
              ? 'section-background-video__media is-ready'
              : 'section-background-video__media'
          }
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload='metadata'
          aria-hidden='true'
          onLoadedData={() => setIsVideoReady(true)}
        />
      ) : null}
    </div>
  );
}
