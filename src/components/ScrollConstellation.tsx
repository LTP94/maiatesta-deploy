import { useCallback, useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { selector: '.services-section', label: 'Services' },
  { selector: '.projects-section', label: 'Projects' },
  { selector: '.luminescent-banner', label: 'Featured' },
  { selector: '.contact-section',   label: 'Contact'  },
] as const;

export function ScrollConstellation() {
  const nodePositionsRef = useRef<number[]>([]);
  const rafRef           = useRef<number>(0);
  const prevActiveRef    = useRef<number>(-1);

  const [nodePositions,      setNodePositions]      = useState<number[]>([]);
  const [scrollProgress,     setScrollProgress]     = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1);
  const [sparklingIndex,     setSparklingIndex]     = useState<number | null>(null);

  // ─── Measure section positions as 0-1 ratios along total scrollable range ─
  const measureNodes = useCallback(() => {
    const totalScrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    if (totalScrollable <= 0) return;

    const positions = SECTIONS.map(({ selector }) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return 0;
      const ratio =
        (el.getBoundingClientRect().top + window.scrollY) / totalScrollable;
      return Math.min(1, Math.max(0, ratio));
    });

    nodePositionsRef.current = positions;
    setNodePositions(positions);
  }, []);

  // ─── Scroll handler — RAF-throttled state update ──────────────────────
  const handleScroll = useCallback(() => {
    if (rafRef.current) return; // already queued for this frame

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;

      const totalScrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const progress = Math.min(
        1,
        Math.max(0, window.scrollY / totalScrollable),
      );

      setScrollProgress(progress);

      // Determine active section (last one whose start ≤ current progress)
      const positions = nodePositionsRef.current;
      let newActive = -1;
      for (let i = 0; i < positions.length; i++) {
        if ((positions[i] ?? 0) <= progress + 0.008) newActive = i;
      }
      setActiveSectionIndex(newActive);
    });
  }, []);

  // ─── Sparkle burst when the comet reaches a new section star ─────────
  useEffect(() => {
    if (
      activeSectionIndex >= 0 &&
      activeSectionIndex !== prevActiveRef.current
    ) {
      setSparklingIndex(activeSectionIndex);
      const timer = window.setTimeout(() => setSparklingIndex(null), 650);
      prevActiveRef.current = activeSectionIndex;
      return () => window.clearTimeout(timer);
    }
    prevActiveRef.current = activeSectionIndex;
  }, [activeSectionIndex]);

  // ─── Mount: measure section offsets + re-measure on resize ───────────
  useEffect(() => {
    measureNodes();
    window.addEventListener('resize', measureNodes);
    return () => window.removeEventListener('resize', measureNodes);
  }, [measureNodes]);

  // ─── Mount: attach scroll listener ───────────────────────────────────
  useEffect(() => {
    handleScroll(); // set initial position
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0; // reset guard so future mounts can queue new RAFs
      }
    };
  }, [handleScroll]);

  // ─── Click: smooth-scroll to section ─────────────────────────────────
  const jumpTo = (selector: string) => {
    document
      .querySelector<HTMLElement>(selector)
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  // Don't render until we have measured positions
  if (nodePositions.length === 0) return null;

  const pct = `${scrollProgress * 100}%`;

  return (
    <div className='scroll-constellation' aria-hidden='true'>
      <div className='scroll-track'>
        <div className='scroll-track__fill' style={{ height: pct }} />
        <div className='scroll-comet'       style={{ top: pct }} />

        {SECTIONS.map((section, i) => {
          const isActive    = activeSectionIndex === i;
          const isSparkling = sparklingIndex === i;
          const classNames  = [
            'scroll-node',
            isActive    ? 'is-active'    : '',
            isSparkling ? 'is-sparkling' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={section.selector}
              className={classNames}
              style={{ top: `${(nodePositions[i] ?? 0) * 100}%` }}
              onClick={() => jumpTo(section.selector)}
              tabIndex={-1}
            >
              <span className='scroll-node__burst' />
              <span className='scroll-node__label'>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
