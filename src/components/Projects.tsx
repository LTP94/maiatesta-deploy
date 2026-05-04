import type { LocalizedContent } from "../data/siteContent";
import { siteContent } from "../data/siteContent";
import { SectionBackground } from "./SectionBackground";

type ProjectsProps = {
  content: LocalizedContent;
};

export function Projects({ content }: ProjectsProps) {
  return (
    <section className="section projects-section" id="projects">
      <SectionBackground src={siteContent.brand.sectionBackgroundVideos.projects} />
      <div className="section-heading scroll-reveal">
        <p className="eyebrow">{content.sections.projects.eyebrow}</p>
        <h2>{content.sections.projects.title}</h2>
        <p>{content.sections.projects.body}</p>
      </div>
      <div className="project-grid">
        {content.projects.map((project, index) => (
          <article className="project-card scroll-reveal" key={project.name} style={{ animationDelay: `${index * 90}ms` }}>
            <span>{project.type}</span>
            <h3>{project.name}</h3>
            <p>{project.result}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
