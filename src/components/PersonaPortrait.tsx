import { useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

type PersonaPortraitProps = {
  image: string;
  alt: string;
};

const neutralTilt = { x: 500, y: 50 };

export function PersonaPortrait({ image, alt }: PersonaPortraitProps) {
  const [tilt, setTilt] = useState(neutralTilt);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setTilt({
      x: Number((x * 10).toFixed(2)),
      y: Number((y * -10).toFixed(2)),
    });
  };

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
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt(neutralTilt)}
      >
        <img src={image} alt={alt} />
        <span className='persona-eye persona-eye-left' aria-hidden='true' />
        <span className='persona-eye persona-eye-right' aria-hidden='true' />
      </div>
    </div>
  );
}
