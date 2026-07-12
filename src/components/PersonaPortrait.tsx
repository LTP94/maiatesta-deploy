import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

type PersonaPortraitProps = {
  image: string;
  alt: string;
  isAligned: boolean;
  isMirrored?: boolean;
  onToggle: () => void;
};

/** Interactive circular portrait with orbital ring and coin-flip animation triggered on click or Enter/Space. */
export function PersonaPortrait({
  image,
  alt,
  isAligned,
  isMirrored = false,
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
    <div className='persona-orbit-anchor'>
      <span className='persona-orbit-ring' aria-hidden='true' />
      <span className='persona-orbit-star persona-orbit-star--a' aria-hidden='true' />
      <span className='persona-orbit-star persona-orbit-star--b' aria-hidden='true' />
      <span className='persona-orbit-star persona-orbit-star--c' aria-hidden='true' />
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
        <span
          className='persona-portrait-media'
          style={{ '--persona-image-scale-x': isMirrored ? '-1' : '1' } as CSSProperties}
        >
          <img
            src={image}
            srcSet={`${image.replace('.webp', '-240.webp')} 240w, ${image.replace('.webp', '-480.webp')} 480w, ${image} 720w`}
            sizes="(max-width: 620px) 240px, (max-width: 920px) 300px, 474px"
            alt={alt}
            width='720'
            height='720'
            decoding='async'
            loading='eager'
            fetchPriority='high'
          />
        </span>
      </div>
    </div>
  );
}
