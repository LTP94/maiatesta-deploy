import { useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

type PersonaPortraitProps = {
  image: string;
  alt: string;
  isAligned: boolean;
  onToggle: () => void;
};

const neutralTilt = { x: 380, y: 50 };
const alignedTilt = { x: 0, y: 0 };

export function PersonaPortrait({
  image,
  alt,
  isAligned,
  onToggle,
}: PersonaPortraitProps) {
  const [tilt, setTilt] = useState(neutralTilt);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isAligned) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setTilt({
      x: Number((x * 10).toFixed(2)),
      y: Number((y * -10).toFixed(2)),
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onToggle();
  };

  useEffect(() => {
    setTilt(isAligned ? alignedTilt : neutralTilt);
  }, [isAligned]);

  return (
    <div className='persona-scan-anchor'>
      <span className='persona-scanner-beam' aria-hidden='true' />
      <div
        className='persona-portrait'
        style={
          {
            '--persona-tilt-x': `${tilt.y}deg`,
            '--persona-tilt-y': `${tilt.x}deg`,
          } as CSSProperties
        }
        role='button'
        tabIndex={0}
        aria-pressed={isAligned}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt(isAligned ? alignedTilt : neutralTilt)}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
      >
        <img src={image} alt={alt} />
        <span className='persona-eye persona-eye-left' aria-hidden='true' />
        <span className='persona-eye persona-eye-right' aria-hidden='true' />
      </div>
    </div>
  );
}
