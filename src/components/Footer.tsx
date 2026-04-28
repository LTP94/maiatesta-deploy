import type { LocalizedContent } from "../data/siteContent";

type FooterProps = {
  content: LocalizedContent;
};

export function Footer({ content }: FooterProps) {
  return (
    <footer className="site-footer">
      <div>
        <strong>{content.footer.headline}</strong>
        <p>{content.footer.body}</p>
      </div>
      <span>
        {new Date().getFullYear()} {content.footer.rights}
      </span>
    </footer>
  );
}
