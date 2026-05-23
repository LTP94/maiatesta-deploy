import { useEffect, useRef, useState } from 'react';

/**
 * Returns true once the user has scrolled more than 12 px from the top.
 * Used to toggle the `is-scrolled` class on the app shell and site-main,
 * which intensifies the background after the hero is out of view.
 */
export function useScrolled(): boolean {
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      const next = window.scrollY > 12;

      if (hasScrolledRef.current === next) {
        return;
      }

      hasScrolledRef.current = next;
      setHasScrolled(next);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return hasScrolled;
}
