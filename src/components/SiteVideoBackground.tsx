import { useEffect, useRef, useState } from 'react';
import type { PaletteName } from '../hooks/usePaletteSync';

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
};

const constrainedConnectionTypes = new Set(['slow-2g', '2g', '3g']);
const scrollResumeDelayMs = 900;

type SiteVideoBackgroundProps = {
  palette?: PaletteName;
};

/**
 * One shared, responsive background video for the entire site.
 *
 * The poster is always rendered for instant paint. The video is loaded once,
 * after the critical page work is idle, and is skipped for reduced-motion or
 * constrained-data visitors. Pausing during active scroll keeps the decorative
 * layer from competing with page interaction.
 */
export function SiteVideoBackground({
  palette = 'atlantic',
}: SiteVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isMobileVideo, setIsMobileVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const idleWindow = window as IdleWindow;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileViewport = window.matchMedia('(max-width: 720px)');
    const connection = (navigator as Navigator & {
      connection?: NetworkInformationLike;
    }).connection;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    const cancelScheduledLoad = () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
        idleHandle = undefined;
      }

      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
    };

    const canLoadVideo = () =>
      !reducedMotion.matches &&
      connection?.saveData !== true &&
      !constrainedConnectionTypes.has(connection?.effectiveType ?? '');

    const scheduleLoad = () => {
      cancelScheduledLoad();

      if (!canLoadVideo()) {
        setShouldLoadVideo(false);
        setIsReady(false);
        return;
      }

      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(
          () => setShouldLoadVideo(true),
          { timeout: 1400 },
        );
        return;
      }

      timeoutHandle = window.setTimeout(() => setShouldLoadVideo(true), 450);
    };

    const handleMotionPreference = () => scheduleLoad();
    const handleViewportChange = () => {
      setIsMobileVideo(mobileViewport.matches);
      setIsReady(false);
    };

    setIsMobileVideo(mobileViewport.matches);
    scheduleLoad();
    reducedMotion.addEventListener('change', handleMotionPreference);
    mobileViewport.addEventListener('change', handleViewportChange);

    return () => {
      cancelScheduledLoad();
      reducedMotion.removeEventListener('change', handleMotionPreference);
      mobileViewport.removeEventListener('change', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    let resumeTimer = 0;

    const playVideo = () => {
      if (document.hidden) {
        return;
      }

      void video.play().catch(() => {
        // Autoplay failure keeps the poster visible without affecting content.
      });
    };

    const handleScroll = () => {
      video.pause();
      window.clearTimeout(resumeTimer);
      // Restart after the page has genuinely settled. Resuming the decoder
      // during the tail of a fast mobile scroll can otherwise create a visible
      // hitch on CPU-constrained devices.
      resumeTimer = window.setTimeout(playVideo, scrollResumeDelayMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
        return;
      }

      playVideo();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(resumeTimer);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldLoadVideo]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isReady) {
      document.documentElement.dataset.siteVideo = 'ready';
    } else {
      delete document.documentElement.dataset.siteVideo;
    }

    return () => {
      delete document.documentElement.dataset.siteVideo;
    };
  }, [isReady]);

  const state = hasError
    ? 'error'
    : isReady
      ? 'ready'
      : shouldLoadVideo
        ? 'loading'
        : 'poster';

  return (
    <div
      className={`site-video-bg${isReady ? ' is-ready' : ''}`}
      data-palette={palette}
      data-video-state={state}
      aria-hidden='true'
    >
      <picture className='site-video-bg__poster'>
        <source
          srcSet='/assets/background/cosmic-site-mobile-poster.webp'
          media='(max-width: 720px)'
          type='image/webp'
        />
        <img
          src='/assets/background/cosmic-site-desktop-poster.webp'
          alt=''
          width='1280'
          height='720'
          decoding='async'
        />
      </picture>

      {shouldLoadVideo && !hasError ? (
        <video
          key={isMobileVideo ? 'mobile' : 'desktop'}
          ref={videoRef}
          className='site-video-bg__media'
          autoPlay
          muted
          loop
          playsInline
          preload='metadata'
          disablePictureInPicture
          controlsList='nodownload noremoteplayback'
          onCanPlay={(event) => {
            setIsReady(true);
            void event.currentTarget.play().catch(() => {});
          }}
          onError={() => {
            setHasError(true);
            setIsReady(false);
          }}
        >
          <source
            src={
              isMobileVideo
                ? '/assets/background/cosmic-site-mobile.webm'
                : '/assets/background/cosmic-site-desktop.webm'
            }
            type='video/webm'
          />
          <source
            src={
              isMobileVideo
                ? '/assets/background/cosmic-site-mobile.mp4'
                : '/assets/background/cosmic-site-desktop.mp4'
            }
            type='video/mp4'
          />
        </video>
      ) : null}

      <div className='site-video-bg__veil' />
    </div>
  );
}
