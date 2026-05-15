import { useEffect, useRef, useState } from 'react';

type ServicePreviewProps = {
  href: string;
  image?: string;
  alt?: string;
  title: string;
  isActive: boolean;
};

export function ServicePreview({
  href,
  image,
  alt,
  title,
  isActive,
}: ServicePreviewProps) {
  const previewRef = useRef<HTMLAnchorElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasIntent, setHasIntent] = useState(false);
  const shouldLoadImage = Boolean(image && (hasIntent || (isActive && isInView)));

  useEffect(() => {
    const node = previewRef.current;

    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(isActive);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.intersectionRatio >= 0.75);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.75, 1],
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isActive]);

  return (
    <a
      ref={previewRef}
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
      <span className='service-preview-bar'>
        <span />
        <span />
        <span />
      </span>
      <span className='service-preview-frame'>
        {shouldLoadImage ? (
          <img src={image} alt={alt ?? `${title} preview`} loading='lazy' />
        ) : (
          <span className='service-preview-skeleton' aria-hidden='true' />
        )}
        <span className='service-preview-overlay'>
          <strong>Ver demo</strong>
          <small>Se abre solo al hacer clic</small>
        </span>
      </span>
    </a>
  );
}
