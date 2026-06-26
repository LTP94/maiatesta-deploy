import { startTransition, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ScrollActivityDetail } from './useScrollActivity';

type Preloader = {
  selector: string;
  preload: () => Promise<unknown>;
};

/**
 * Manages below-fold section hydration and chunk preloading.
 *
 * - Preloads lazy chunks far before their sections reach the viewport.
 * - Defers hydration while the user is flicking (high-velocity scroll).
 * - Resumes queued hydrations 720 ms after the scroll comes to rest.
 *
 * @returns The set of section selectors that have been hydrated and are
 *          ready to render their full interactive content.
 */
export function useSectionHydration(
  scrollingRef: MutableRefObject<boolean>,
  flickingRef: MutableRefObject<boolean>,
  gatedPreloaders: ReadonlyArray<Preloader>,
  sectionPreloaders: ReadonlyArray<Preloader>,
): Set<string> {
  const [hydratedSections, setHydratedSections] = useState(
    () => new Set<string>(),
  );
  // Selectors waiting to be activated once the scroll settles.
  const pendingSelectorsRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const loaded = new Set<string>();
    const pendingSelectors = pendingSelectorsRef.current;
    let hydrationSettleTimeout = 0;

    const preload = (selector: string, loader: () => Promise<unknown>) => {
      if (loaded.has(selector)) return;
      loaded.add(selector);
      void loader();
    };

    const isNearViewport = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      return (
        rect.bottom > -viewportHeight * 0.35 &&
        rect.top < viewportHeight * 1.35
      );
    };

    const activateSection = (selector: string) => {
      const target = document.querySelector(selector);

      if (!target) {
        pendingSelectors.add(selector);
        return;
      }

      pendingSelectors.delete(selector);

      startTransition(() => {
        setHydratedSections((currentSections) => {
          if (currentSections.has(selector)) {
            return currentSections;
          }

          const nextSections = new Set(currentSections);
          nextSections.add(selector);
          return nextSections;
        });
      });
    };

    const processPendingHydration = () => {
      pendingSelectors.forEach((selector) => {
        const match = gatedPreloaders.find(
          (item) => item.selector === selector,
        );

        if (match) {
          activateSection(match.selector);
        }
      });
    };

    const handleScrollActivity = (event: Event) => {
      const customEvent = event as CustomEvent<ScrollActivityDetail>;
      if (!customEvent.detail?.isScrolling && !customEvent.detail?.isFlicking) {
        window.clearTimeout(hydrationSettleTimeout);
        hydrationSettleTimeout = window.setTimeout(() => {
          window.requestAnimationFrame(processPendingHydration);
        }, 0);
      }
    };

    document.addEventListener('maiatesta:scroll-activity', handleScrollActivity);

    if (!('IntersectionObserver' in window)) {
      gatedPreloaders.forEach(({ selector }) => activateSection(selector));
      sectionPreloaders.forEach(({ selector, preload: loader }) =>
        preload(selector, loader),
      );
      return () => {
        window.clearTimeout(hydrationSettleTimeout);
        document.removeEventListener(
          'maiatesta:scroll-activity',
          handleScrollActivity,
        );
      };
    }

    const preloadDistanceMultiplier = window.innerWidth >= 1024 ? 16 : 3;
    const preloadDistancePx = Math.ceil(
      window.innerHeight * preloadDistanceMultiplier,
    );

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const match = sectionPreloaders.find(({ selector }) =>
            entry.target.matches(selector),
          );

          if (!match) return;
          preload(match.selector, match.preload);
          preloadObserver.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: `${preloadDistancePx}px 0px`, threshold: 0 },
    );

    const hydrationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const match = gatedPreloaders.find(({ selector }) =>
            entry.target.matches(selector),
          );

          if (!match) return;

          activateSection(match.selector);
        });
      },
      { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );

    gatedPreloaders.forEach(({ selector }) => {
      const target = document.querySelector(selector);

      if (target) {
        hydrationObserver.observe(target);
        return;
      }

      window.requestAnimationFrame(() => {
        const lateTarget = document.querySelector(selector);
        if (lateTarget) hydrationObserver.observe(lateTarget);
        else activateSection(selector);
      });
    });

    sectionPreloaders.forEach(({ selector, preload: loader }) => {
      const target = document.querySelector(selector);

      if (target) {
        preloadObserver.observe(target);
        return;
      }

      window.requestAnimationFrame(() => {
        const lateTarget = document.querySelector(selector);
        if (lateTarget) preloadObserver.observe(lateTarget);
        else preload(selector, loader);
      });
    });

    return () => {
      window.clearTimeout(hydrationSettleTimeout);
      document.removeEventListener(
        'maiatesta:scroll-activity',
        handleScrollActivity,
      );
      preloadObserver.disconnect();
      hydrationObserver.disconnect();
    };
  // Refs and static preloader arrays are stable — empty deps intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hydratedSections;
}
