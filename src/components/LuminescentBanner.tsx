import { LuminousText } from './LuminousText';

type LuminescentBannerProps = {
  eyebrow: string;
  title: string;
  body: string;
  tone?: "bronze" | "silver";
};

const bannerHighlightPhrases = [
  'premium graphite and bronze identity',
  'Automation, software, and commerce',
  'identidad grafito y bronce premium',
  'Automatización, software y comercio',
  'one visual language',
  'un mismo lenguaje visual',
];

export function LuminescentBanner({ eyebrow, title, body, tone = "bronze" }: LuminescentBannerProps) {
  return (
    <section className={`luminescent-banner ${tone} scroll-reveal`}>
      <div>
        <span>{eyebrow}</span>
        <strong>
          <LuminousText text={title} phrases={bannerHighlightPhrases} />
        </strong>
      </div>
      <p>{body}</p>
    </section>
  );
}
