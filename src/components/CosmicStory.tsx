import { useEffect, useRef, useState } from 'react';
import type { LanguageCode, LocalizedContent } from '../data/siteContent';
import { LuminousText } from './LuminousText';

type CosmicStoryProps = {
  content: LocalizedContent;
  language: LanguageCode;
};

const storyHighlights = [
  'modernas,',
  'automatización real.',
  'Modern solutions,',
  'real automation.',
];

export function CosmicStory({ content, language }: CosmicStoryProps) {
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const visualRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeMetric = content.hero.metrics[activeMetricIndex];
  const cycleMetric = () => {
    setActiveMetricIndex((currentIndex) =>
      (currentIndex + 1) % content.hero.metrics.length,
    );
  };

  useEffect(() => {
    const visual = visualRef.current;

    if (!visual || typeof window === 'undefined') {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let loadTimer = 0;

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      setShouldLoadVideo(!reducedMotion.matches);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.clearTimeout(loadTimer);
          loadTimer = window.setTimeout(() => {
            setShouldLoadVideo(true);
            void videoRef.current?.play().catch(() => {});
          }, 280);
        } else {
          window.clearTimeout(loadTimer);
          videoRef.current?.pause();
        }
      },
      { rootMargin: '420px 0px', threshold: 0.05 },
    );

    observer.observe(visual);
    return () => {
      window.clearTimeout(loadTimer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!shouldLoadVideo || !video) {
      return;
    }

    video.load();
    void video.play().catch(() => {});
  }, [shouldLoadVideo]);

  const toggleAudio = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextMutedState = !isMuted;
    video.muted = nextMutedState;
    setIsMuted(nextMutedState);
    void video.play().catch(() => {});
  };

  return (
    <div className='cosmic-story bot-cosmic-story' aria-labelledby='cosmic-story-title'>
      <div className='cosmic-story__inner'>
        <figure
          ref={visualRef}
          className='cosmic-story__visual scroll-reveal'
          data-signal={activeMetricIndex}
        >
          <video
            ref={videoRef}
            className='cosmic-story__video'
            poster='/assets/intro/why-maiatesta-poster.webp'
            width='540'
            height='960'
            autoPlay
            muted={isMuted}
            loop
            playsInline
            preload='none'
            aria-label={
              language === 'es'
                ? 'Introducción de Maiatesta a la inteligencia artificial para negocios'
                : 'Maiatesta introduction to artificial intelligence for business'
            }
          >
            {shouldLoadVideo ? (
              <>
                <source
                  src='/assets/intro/why-maiatesta.webm'
                  type='video/webm'
                />
                <source
                  src='/assets/intro/why-maiatesta.mp4'
                  type='video/mp4'
                />
              </>
            ) : null}
          </video>
          <div className='cosmic-story__scan' aria-hidden='true' />
          <span className='cosmic-story__signal-orbit' aria-hidden='true' />
          <figcaption>
            <span>{language === 'es' ? 'Base de operaciones' : 'Operations base'}</span>
            <strong>Quito · Ecuador</strong>
          </figcaption>
          <button
            className='cosmic-story__visual-cta'
            type='button'
            onClick={cycleMetric}
            aria-label={
              language === 'es'
                ? 'Cambiar la señal destacada'
                : 'Change the highlighted signal'
            }
          >
            <span aria-hidden='true'>◎</span>
            {language === 'es' ? 'Explorar señal' : 'Explore signal'}
          </button>
          {shouldLoadVideo ? (
            <button
              className='cosmic-story__audio-cta'
              type='button'
              aria-pressed={!isMuted}
              onClick={toggleAudio}
            >
              <span aria-hidden='true'>{isMuted ? '♪' : '◼'}</span>
              {isMuted
                ? language === 'es'
                  ? 'Activar audio'
                  : 'Play audio'
                : language === 'es'
                  ? 'Silenciar'
                  : 'Mute'}
            </button>
          ) : null}
        </figure>

        <div className='cosmic-story__copy scroll-reveal'>
          <p className='eyebrow'>{content.sections.reviews.eyebrow}</p>
          <h2 id='cosmic-story-title'>
            <LuminousText
              text={content.sections.reviews.title}
              phrases={storyHighlights}
            />
          </h2>
          <p>{content.sections.reviews.body}</p>

          <div className='cosmic-metrics' aria-label={language === 'es' ? 'Resultados' : 'Outcomes'}>
            {content.hero.metrics.map((metric, index) => (
              <button
                className={`cosmic-metric${index === activeMetricIndex ? ' is-active' : ''}`}
                key={metric.value}
                type='button'
                aria-pressed={index === activeMetricIndex}
                onClick={() => setActiveMetricIndex(index)}
              >
                <span className='cosmic-metric__title'>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{metric.value}</strong>
                </span>
                <span className='cosmic-metric__description'>{metric.label}</span>
              </button>
            ))}
          </div>
          <p className='cosmic-story__active-signal' aria-live='polite'>
            <span>{language === 'es' ? 'Señal seleccionada' : 'Selected signal'}</span>
            <strong>{activeMetric?.value}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
