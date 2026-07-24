import { useEffect, useState } from 'react';

type TypingTextProps = {
  phrases: string[];
};

type TypingPhase = 'typing' | 'holding' | 'deleting';

export function TypingText({ phrases }: TypingTextProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(0);
  const [phase, setPhase] = useState<TypingPhase>('typing');
  const [reduceMotion, setReduceMotion] = useState(false);

  const safePhrases = phrases.filter(Boolean);
  const currentPhrase = safePhrases[phraseIndex % Math.max(safePhrases.length, 1)] ?? '';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(mediaQuery.matches);

    syncMotionPreference();
    mediaQuery.addEventListener('change', syncMotionPreference);

    return () => mediaQuery.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    setPhraseIndex(0);
    setVisibleLength(0);
    setPhase('typing');
  }, [phrases.join('|')]);

  useEffect(() => {
    if (reduceMotion || safePhrases.length === 0) return;

    let delay = 54;
    let nextPhase = phase;
    let nextLength = visibleLength;
    let shouldAdvancePhrase = false;

    if (phase === 'typing' && visibleLength >= currentPhrase.length) {
      delay = 1900;
      nextPhase = 'holding';
    } else if (phase === 'holding') {
      delay = 320;
      nextPhase = 'deleting';
    } else if (phase === 'deleting' && visibleLength === 0) {
      delay = 260;
      nextPhase = 'typing';
      shouldAdvancePhrase = true;
    } else if (phase === 'deleting') {
      delay = 28;
      nextLength = Math.max(visibleLength - 1, 0);
    } else {
      nextLength = Math.min(visibleLength + 1, currentPhrase.length);
    }

    const timeoutId = window.setTimeout(() => {
      if (shouldAdvancePhrase) {
        setPhraseIndex((current) => (current + 1) % safePhrases.length);
      }
      setVisibleLength(nextLength);
      setPhase(nextPhase);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentPhrase,
    phase,
    reduceMotion,
    safePhrases.length,
    visibleLength,
  ]);

  const visibleText = reduceMotion ? currentPhrase : currentPhrase.slice(0, visibleLength);

  return (
    <span className='typing-text'>
      <span className='sr-only'>{safePhrases.join(' · ')}</span>
      <span className='typing-text__value' aria-hidden='true'>
        {visibleText}
      </span>
      <span className='typing-text__caret' aria-hidden='true' />
    </span>
  );
}
