import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

/**
 * Scrolls to the URL hash anchor whenever `language` changes.
 * Skips the scroll when the language change was triggered interactively
 * (i.e. the user clicked a language toggle, not a full page reload).
 */
export function useHashNavigation(
  language: unknown,
  isInteractiveLangChange: MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (isInteractiveLangChange.current) {
      isInteractiveLangChange.current = false;
      return;
    }

    if (!window.location.hash) {
      return;
    }

    const scrollToHash = () => {
      const target = document.querySelector(window.location.hash);

      if (!target) {
        return;
      }

      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY,
        behavior: 'auto',
      });
    };

    window.requestAnimationFrame(scrollToHash);
    const shortDelay = window.setTimeout(scrollToHash, 120);
    const layoutDelay = window.setTimeout(scrollToHash, 420);

    return () => {
      window.clearTimeout(shortDelay);
      window.clearTimeout(layoutDelay);
    };
  // language is used only as a trigger dependency, not read inside the effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
}
