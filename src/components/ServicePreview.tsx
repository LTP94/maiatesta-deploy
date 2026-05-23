import { useEffect, useRef, useState } from 'react';

type ServicePreviewProps = {
  href?: string;
  image?: string;
  alt?: string;
  title: string;
  isActive: boolean;
  videoMp4?: string;
  videoWebm?: string;
};

/** Service card mini-browser preview: renders an image or auto-playing video thumbnail when the card is active and near the viewport. */
export function ServicePreview({
  href,
  image,
  alt,
  title,
  isActive,
  videoMp4,
  videoWebm,
}: ServicePreviewProps) {
  const previewRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasIntent, setHasIntent] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [isStableActive, setIsStableActive] = useState(false);
  const [isScrollIdle, setIsScrollIdle] = useState(true);
  const hasVideo = Boolean(videoMp4 || videoWebm);
  const shouldLoadVideo =
    hasVideo &&
    isScrollIdle &&
    (hasIntent ||
      (isActive && isInView && (!isSmallViewport || isStableActive)));
  const previewClassName = hasVideo
    ? 'service-card-preview has-video'
    : 'service-card-preview';
  const setPreviewNode = (node: HTMLAnchorElement | HTMLSpanElement | null) => {
    previewRef.current = node;
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 620px)');
    const syncViewport = () => setIsSmallViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setIsStableActive(false);
      return;
    }

    const stableDelayMs = isSmallViewport ? 800 : 0;
    if (stableDelayMs === 0) {
      setIsStableActive(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsStableActive(true);
    }, stableDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [isActive, isSmallViewport]);

  useEffect(() => {
    const node = previewRef.current;

    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(isActive);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.intersectionRatio >= 0.45);
      },
      {
        root: null,
        rootMargin: isSmallViewport ? '160px 0px' : '420px 0px',
        threshold: [0, 0.45, 0.75, 1],
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isActive, isSmallViewport]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const syncScrollActivity = (event?: Event) => {
      const customEvent = event as
        | CustomEvent<{ isScrolling?: boolean }>
        | undefined;
      const isScrolling =
        customEvent?.detail?.isScrolling ??
        document.documentElement.classList.contains('is-scrolling');

      setIsScrollIdle(!isScrolling);

      if (isScrolling) {
        videoRef.current?.pause();
      }
    };

    syncScrollActivity();

    document.addEventListener('maiatesta:scroll-activity', syncScrollActivity);

    return () => {
      document.removeEventListener(
        'maiatesta:scroll-activity',
        syncScrollActivity,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      if (document.hidden || !isInView || !isActive || !isScrollIdle) {
        video.pause();
        return;
      }

      void video.play().catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isInView, isScrollIdle, shouldLoadVideo]);

  const media = (
    <>
      <span className='service-preview-bar'>
        <span />
        <span />
        <span />
      </span>
      <span className='service-preview-frame'>
        {shouldLoadVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload='none'
            poster={image}
            aria-label={alt ?? `${title} preview`}
          >
            {videoWebm ? <source src={videoWebm} type='video/webm' /> : null}
            {videoMp4 ? <source src={videoMp4} type='video/mp4' /> : null}
          </video>
        ) : image ? (
          <img
            src={image}
            alt={alt ?? `${title} preview`}
            loading='lazy'
            decoding='async'
          />
        ) : (
          <span className='service-preview-skeleton' aria-hidden='true' />
        )}
        <span className='service-preview-overlay'>
          <strong>{href ? 'Ver demo' : 'Vista previa'}</strong>
          <small>
            {href ? 'Se abre solo al hacer clic' : 'Video corto del servicio'}
          </small>
        </span>
      </span>
    </>
  );

  if (!href) {
    return (
      <span
        ref={setPreviewNode}
        className={previewClassName}
        onMouseEnter={() => setHasIntent(true)}
        onFocus={() => setHasIntent(true)}
        onTouchStart={() => setHasIntent(true)}
        aria-label={`${title} preview`}
      >
        {media}
      </span>
    );
  }

  return (
    <a
      ref={setPreviewNode}
      className={previewClassName}
      href={href}
      target='_blank'
      rel='noreferrer'
      onClick={(event) => event.stopPropagation()}
      onMouseEnter={() => setHasIntent(true)}
      onFocus={() => setHasIntent(true)}
      onTouchStart={() => setHasIntent(true)}
      aria-label={`${title} demo`}
    >
      {media}
    </a>
  );
}
