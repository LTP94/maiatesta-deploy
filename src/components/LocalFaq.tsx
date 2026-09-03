import { useState } from 'react';
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

/** FAQ accordion section. Renders the first N items expanded and shows a "load more" button for the rest. */
export function LocalFaq({ content }: LocalFaqProps) {
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const visibleFaqCount = 3;
  const hiddenFaqCount = Math.max(0, content.faqs.items.length - visibleFaqCount);

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
            className={`local-faq-item scroll-reveal${
              !showAllFaqs && index >= visibleFaqCount
                ? ' local-faq-item--extra'
                : ''
            }`}
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
      {hiddenFaqCount > 0 ? (
        <div className='local-faq-actions scroll-reveal'>
          <button
            className='local-faq-more'
            type='button'
            aria-expanded={showAllFaqs}
            onClick={() => setShowAllFaqs((currentValue) => !currentValue)}
          >
            {showAllFaqs
              ? content.faqs.showLessLabel
              : content.faqs.showMoreLabel.replace('{count}', String(hiddenFaqCount))}
          </button>
        </div>
      ) : null}
    </section>
  );
}
