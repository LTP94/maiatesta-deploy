import { useEffect, useRef } from 'react';
import { useMediaQuery } from './useMediaQuery';

const maxOffsetPx = 8;

/**
 * Attracts an element toward the cursor within a small capped radius.
 * Disabled on touch/stylus input and when the visitor prefers reduced motion.
 */
export function useMagneticHover<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');
  const isEnabled = !prefersReducedMotion && !isCoarsePointer;

  useEffect(() => {
    const element = ref.current;
    if (!element || !isEnabled) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);
      const x = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, offsetX * 0.32));
      const y = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, offsetY * 0.32));

      element.style.transition = 'none';
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const handlePointerLeave = () => {
      element.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
      element.style.transform = 'translate3d(0, 0, 0)';

      // Hand control back to the stylesheet (e.g. the :hover lift) once the
      // spring-back settles, so this inline style doesn't linger and block it.
      window.setTimeout(() => {
        element.style.removeProperty('transition');
        element.style.removeProperty('transform');
      }, 340);
    };

    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerleave', handlePointerLeave);
      element.style.removeProperty('transition');
      element.style.removeProperty('transform');
    };
  }, [isEnabled]);

  return ref;
}
