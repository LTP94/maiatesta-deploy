type SectionBackgroundProps = {
  src: string;
};

export function SectionBackground({ src }: SectionBackgroundProps) {
  return (
    <video
      className='section-background-video'
      src={src}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden='true'
    />
  );
}
