import type { LocalizedContent } from '../data/siteContent';
import { LuminousText } from './LuminousText';

const faqHighlightPhrases = [
  'Quito',
  'businesses in Quito',
  'negocios en Quito',
  'Preguntas comunes',
];

type LocalFaqProps = {
  content: LocalizedContent;
};

export function LocalFaq({ content }: LocalFaqProps) {
  return (
    <section className='section local-faq-section' id='local-faq'>
      <div className='section-heading scroll-reveal'>
        <p className='eyebrow'>{content.faqs.eyebrow}</p>
        <h2>
          <LuminousText
            text={content.faqs.title}
            phrases={faqHighlightPhrases}
          />
        </h2>
        <p>{content.faqs.body}</p>
      </div>
      <div className='local-faq-grid'>
        {content.faqs.items.map((item, index) => (
          <article
            className='local-faq-item scroll-reveal'
            key={item.question}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
