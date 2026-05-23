import { useEffect } from 'react';

export type PaletteName =
  | 'current'
  | 'atlantic'
  | 'tropical'
  | 'sunset'
  | 'sand';

/**
 * Persists the active palette to localStorage when `save` is true.
 * When `save` is false this is a no-op, keeping the page stateless.
 */
export function usePaletteSync(palette: PaletteName, save: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined' || !save) {
      return;
    }

    window.localStorage.setItem('maiatesta-palette', palette);
  }, [palette, save]);
}
