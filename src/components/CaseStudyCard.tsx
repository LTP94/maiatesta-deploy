import { useState } from 'react';

type CaseStudyCardProps = {
  clientName: string;
  sector: string;
  href: string;
  posterImage: string;
  videoMp4: string;
  videoWebm: string;
  alt: string;
  durationLabel: string;
  realClientBadge: string;
  watchLabel: string;
};

type PlaybackState = 'idle' | 'loading' | 'playing';

export function CaseStudyCard({
  clientName,
  sector,
  href,
  posterImage,
  videoMp4,
  videoWebm,
  alt,
  durationLabel,
  realClientBadge,
  watchLabel,
}: CaseStudyCardProps) {
  const [playback, setPlayback] = useState<PlaybackState>('idle');

  return (
    <figure className='case-study-card scroll-reveal'>
      <div className='case-study-card__media'>
        {playback === 'idle' ? (
          <button
            type='button'
            className='case-study-card__trigger'
            onClick={() => setPlayback('loading')}
            aria-label={`${alt} — ${watchLabel} (${durationLabel})`}
          >
            <img
              src={posterImage}
              alt={alt}
              width={540}
              height={960}
              decoding='async'
              loading='lazy'
            />
            <span className='case-study-card__scrim' aria-hidden='true' />
            <span className='case-study-card__badge case-study-card__badge--real' aria-hidden='true'>
              {realClientBadge}
            </span>
            <span className='case-study-card__badge case-study-card__badge--meta' aria-hidden='true'>
              <span className='case-study-card__sound'>♪</span>
              {durationLabel}
            </span>
            <span className='case-study-card__play-ring' aria-hidden='true'>
              <span className='case-study-card__play'>▶</span>
            </span>
            <span className='case-study-card__hint' aria-hidden='true'>{watchLabel}</span>
          </button>
        ) : (
          <>
            <video
              className='case-study-card__video'
              width={540}
              height={960}
              controls
              autoPlay
              playsInline
              poster={posterImage}
              onPlaying={() => setPlayback('playing')}
            >
              <source src={videoWebm} type='video/webm' />
              <source src={videoMp4} type='video/mp4' />
            </video>
            {playback === 'loading' ? (
              <span className='case-study-card__loading' aria-hidden='true'>
                <span />
                <span />
                <span />
              </span>
            ) : null}
          </>
        )}
      </div>
      <figcaption className='case-study-card__byline'>
        <a href={href} target='_blank' rel='noreferrer'>
          <strong>{clientName}</strong>
        </a>
        <span>{sector}</span>
      </figcaption>
    </figure>
  );
}
