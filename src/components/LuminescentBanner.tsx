type LuminescentBannerProps = {
  eyebrow: string;
  title: string;
  body: string;
  tone?: "bronze" | "silver";
};

export function LuminescentBanner({ eyebrow, title, body, tone = "bronze" }: LuminescentBannerProps) {
  return (
    <section className={`luminescent-banner ${tone} scroll-reveal`}>
      <div>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
      <p>{body}</p>
    </section>
  );
}
