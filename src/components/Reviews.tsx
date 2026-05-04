import type { LocalizedContent } from "../data/siteContent";
import { siteContent } from "../data/siteContent";
import { SectionBackground } from "./SectionBackground";

type ReviewsProps = {
  content: LocalizedContent;
};

export function Reviews({ content }: ReviewsProps) {
  return (
    <section className="section reviews-section" id="reviews">
      <SectionBackground src={siteContent.brand.sectionBackgroundVideos.reviews} />
      <div className="section-heading scroll-reveal">
        <p className="eyebrow">{content.sections.reviews.eyebrow}</p>
        <h2>{content.sections.reviews.title}</h2>
        <p>{content.sections.reviews.body}</p>
      </div>
      <div className="review-track">
        {content.reviews.map((review, index) => (
          <figure className="review-card scroll-reveal" key={review.author} style={{ animationDelay: `${index * 100}ms` }}>
            <blockquote>{review.quote}</blockquote>
            <figcaption>
              <strong>{review.author}</strong>
              <span>{review.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
