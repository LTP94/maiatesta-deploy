import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

type PersonaPortraitProps = {
  image: string;
  alt: string;
  isAligned: boolean;
  onToggle: () => void;
};

export function PersonaPortrait({
  image,
  alt,
  isAligned,
  onToggle,
}: PersonaPortraitProps) {
  const [isFlipping, setIsFlipping] = useState(false);

  const handleClick = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    onToggle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleClick();
  };

  return (
    <div className='persona-scan-anchor'>
      <span className='persona-scanner-beam' aria-hidden='true' />
      <div
        className={`persona-portrait${isFlipping ? ' is-flipping' : ''}`}
        style={
          {
            '--persona-tilt-x': '0deg',
            '--persona-tilt-y': '0deg',
          } as CSSProperties
        }
        role='button'
        tabIndex={0}
        aria-pressed={isAligned}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onAnimationEnd={(e) => {
          if (e.animationName === 'coin-flip') {
            setIsFlipping(false);
          }
        }}
      >
        <img src={image} alt={alt} />
      </div>
    </div>
  );
}
