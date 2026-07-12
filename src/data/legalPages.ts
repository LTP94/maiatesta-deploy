import type { LegalRouteSlug } from './legalRoutes';
import { allLegalPages } from './legal/index';

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'subheading'; text: string };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalPage = {
  slug: LegalRouteSlug;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const legalPages = allLegalPages satisfies LegalPage[];

export const legalPagesBySlug = Object.fromEntries(
  legalPages.map((page) => [page.slug, page]),
) as Record<LegalRouteSlug, LegalPage>;

export function getLegalPageByPath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;

  for (const page of legalPages) {
    if (normalizedPath === `/${page.slug}/`) {
      return page;
    }
  }

  return undefined;
}
