import type { LocalizedContent } from '../data/siteContent';
import { CaseStudyCard } from './CaseStudyCard';

type CaseStudyShowcaseProps = {
  content: LocalizedContent;
};

export function CaseStudyShowcase({ content }: CaseStudyShowcaseProps) {
  if (content.caseStudyVideos.length === 0) return null;

  return (
    <section className='section case-study-section' aria-labelledby='case-study-title'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.sections.caseStudies.eyebrow}</p>
        <h2 id='case-study-title'>{content.sections.caseStudies.title}</h2>
        <p>{content.sections.caseStudies.body}</p>
      </div>

      <div className='case-study-grid'>
        {content.caseStudyVideos.map((video) => (
          <CaseStudyCard
            key={video.id}
            clientName={video.clientName}
            sector={video.sector}
            href={video.href}
            posterImage={video.posterImage}
            videoMp4={video.videoMp4}
            videoWebm={video.videoWebm}
            alt={video.alt}
            durationLabel={video.durationLabel}
            realClientBadge={content.sections.caseStudies.realClientBadge}
            watchLabel={content.sections.caseStudies.watchLabel}
          />
        ))}
      </div>
    </section>
  );
}
