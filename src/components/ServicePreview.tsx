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
  const [isInView, setIsInView] = useState(false);
  const [hasIntent, setHasIntent] = useState(false);
  const hasVideo = Boolean(videoMp4 || videoWebm);
  const shouldLoadVideo = hasVideo && (hasIntent || (isActive && isInView));
  const setPreviewNode = (node: HTMLAnchorElement | HTMLSpanElement | null) => {
    previewRef.current = node;
  };

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
        rootMargin: '96px 0px',
        threshold: [0, 0.45, 0.75, 1],
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isActive]);

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
        className='service-card-preview'
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
      className='service-card-preview'
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
