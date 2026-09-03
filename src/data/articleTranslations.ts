import type { ArticleRouteSlug } from './articleRoutes';
import type { LanguageCode } from './content/types';
import type { ArticlePage } from './articlePages';

/**
 * English title/keyword/excerpt for each guide card (GuidesTeaser,
 * GuidesIndexPage). The full article body (sections, FAQs, SEO metadata)
 * stays Spanish-only in src/data/articles/ — translating that is a separate,
 * larger content decision. This only covers what's shown on a card.
 */
export const articleCardTranslationsEn: Record<
  ArticleRouteSlug,
  { title: string; primaryKeyword: string; excerpt: string }
> = {
  'cuanto-cuesta-chatbot-whatsapp-ecuador': {
    title: 'How much does a WhatsApp chatbot cost in Ecuador',
    primaryKeyword: 'how much does a WhatsApp chatbot cost in Ecuador',
    excerpt:
      'A WhatsApp chatbot can start from $60 for a basic flow. The price goes up when it needs advanced AI, a database, CRM, payments, or logic connected to inventory.',
  },
  'pagina-web-negocio-pequeno-quito': {
    title: 'Website for a small business in Quito',
    primaryKeyword: 'website for a small business in Quito',
    excerpt:
      'A website for a small business in Quito needs to explain the offer, build trust, load fast on mobile, and take the customer straight to WhatsApp.',
  },
  'software-inventario-pymes-quito': {
    title: 'Inventory software for SMEs in Quito',
    primaryKeyword: 'inventory software for SMEs in Quito',
    excerpt:
      'An SME needs inventory software once it no longer knows what stock it has, what went out, who moved products, or when to restock.',
  },
  'automatizar-reportes-excel-pyme': {
    title: 'How to automate Excel reports for an SME',
    primaryKeyword: 'automate Excel reports for an SME',
    excerpt:
      'Automating Excel reports helps reduce errors, save time, and make decisions with cleaner data without building full software from day one.',
  },
  'cuanto-cuesta-software-a-medida-ecuador': {
    title: 'How much does custom software cost in Ecuador',
    primaryKeyword: 'how much does custom software cost in Ecuador',
    excerpt:
      'The cost of custom software in Ecuador varies by modules, users, and integrations. This guide explains typical ranges, what drives the price up, and when it is not worth investing yet.',
  },
  'software-a-medida-vs-excel-pyme': {
    title: 'Custom software vs. Excel for SMEs',
    primaryKeyword: 'custom software vs Excel for SMEs',
    excerpt:
      'Excel works until it does not. This guide helps SMEs in Ecuador decide whether to stay on Excel, automate it, or make the jump to custom software.',
  },
  'integrar-inventario-facturacion-electronica-sri-ecuador': {
    title: 'Inventory and SRI e-invoicing in Ecuador',
    primaryKeyword: 'integrate inventory and SRI e-invoicing in Ecuador',
    excerpt:
      'Many SMEs in Ecuador log sales in Excel or in their inventory and then issue invoices separately. That duplicate work causes errors and wastes time. This guide explains how to connect both workflows.',
  },
  'software-inventario-restaurantes-quito': {
    title: 'Inventory software for restaurants in Quito',
    primaryKeyword: 'restaurant inventory software in Quito',
    excerpt:
      'A restaurant’s inventory does not work the same way as a store’s. Supplies are perishable, recipes share ingredients, and waste piles up silently. Excel is not enough to control all of that.',
  },
  'crm-whatsapp-pymes-ecuador': {
    title: 'CRM and WhatsApp for SMEs in Ecuador',
    primaryKeyword: 'CRM and WhatsApp for SMEs in Ecuador',
    excerpt:
      'Many SMEs in Ecuador use WhatsApp as their main sales channel, but without a tracking system, leads get lost in the chat history. A CRM solves that problem.',
  },
  'inventario-fisico-tienda-online-ecuador': {
    title: 'Physical inventory and online store in Ecuador',
    primaryKeyword: 'online store and physical inventory in Ecuador',
    excerpt:
      'Selling in-store and online at the same time seems like an advantage, but without inventory sync it becomes a problem: overselling, unhappy customers, and double work for the team.',
  },
};

/** Card-level text only (title/primaryKeyword/excerpt) — falls back to the
 * Spanish original for 'es' or if a slug has no translation yet. */
export function getArticleCardText(guide: ArticlePage, language: LanguageCode) {
  if (language === 'en') {
    const translation = articleCardTranslationsEn[guide.slug];
    if (translation) {
      return translation;
    }
  }

  return {
    title: guide.title,
    primaryKeyword: guide.primaryKeyword,
    excerpt: guide.excerpt,
  };
}
