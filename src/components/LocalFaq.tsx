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
          <details
            className='local-faq-item scroll-reveal'
            key={item.question}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <summary>
              <span className='local-faq-question'>{item.question}</span>
              <span className='local-faq-toggle' aria-hidden='true' />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
