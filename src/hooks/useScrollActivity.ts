import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

export type ScrollActivityDetail = {
  isScrolling: boolean;
  isFlicking: boolean;
  velocity: number;
};

export function emitScrollActivity(
  isScrolling: boolean,
  isFlicking = false,
  velocity = 0,
) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('is-scrolling', isScrolling);
  document.documentElement.classList.toggle('is-flicking', isFlicking);
  document.dispatchEvent(
    new CustomEvent('maiatesta:scroll-activity', {
      detail: { isScrolling, isFlicking, velocity } satisfies ScrollActivityDetail,
    }),
  );
}

/**
 * Pauses decorative motion while the user is actively scrolling or swiping.
 * Writes to the provided refs so other hooks can read scroll/flick state
 * without subscribing to DOM events themselves.
 */
export function useScrollActivity(
  scrollingRef: MutableRefObject<boolean>,
  flickingRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let rafId = 0;
    let idleTimeoutId = 0;
    let isScrolling = false;
    let isFlicking = false;
    let lastY = window.scrollY;
    let lastTs = performance.now();
    const flickThreshold = window.innerWidth <= 920 ? 1.35 : 2.2;

    const setScrollState = (
      nextScrolling: boolean,
      nextFlicking: boolean,
      velocity = 0,
    ) => {
      if (isScrolling === nextScrolling && isFlicking === nextFlicking) {
        return;
      }

      isScrolling = nextScrolling;
      isFlicking = nextFlicking;
      scrollingRef.current = nextScrolling;
      flickingRef.current = nextFlicking;
      emitScrollActivity(nextScrolling, nextFlicking, velocity);
    };

    const markScrolling = () => {
      scrollingRef.current = true;

      if (rafId === 0) {
        rafId = window.requestAnimationFrame((now) => {
          rafId = 0;
          const nextY = window.scrollY;
          const deltaMs = Math.max(16, now - lastTs);
          const velocity = Math.abs(nextY - lastY) / deltaMs;

          lastY = nextY;
          lastTs = now;
          setScrollState(true, velocity >= flickThreshold, velocity);
        });
      }

      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(() => {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        lastY = window.scrollY;
        lastTs = performance.now();
        setScrollState(false, false, 0);
      }, 150);
    };

    const options: AddEventListenerOptions = { passive: true };

    window.addEventListener('scroll', markScrolling, options);
    window.addEventListener('touchmove', markScrolling, options);
    window.addEventListener('wheel', markScrolling, options);

    return () => {
      window.removeEventListener('scroll', markScrolling);
      window.removeEventListener('touchmove', markScrolling);
      window.removeEventListener('wheel', markScrolling);
      window.clearTimeout(idleTimeoutId);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      scrollingRef.current = false;
      flickingRef.current = false;
      emitScrollActivity(false, false, 0);
    };
  // Refs are stable — empty deps intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
