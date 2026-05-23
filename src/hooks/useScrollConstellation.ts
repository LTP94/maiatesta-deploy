import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is wide enough to show the scroll
 * constellation (≥ 1536 px). Responds to window resize.
 */
export function useScrollConstellation(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1536px)');
    const sync = () => setShouldShow(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener('change', sync);

    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return shouldShow;
}
