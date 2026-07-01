import type { PillarRouteSlug } from './pillarRoutes';
import type { FeatureImage } from './servicePages';
import { allPillarPages } from './pillars/index';

export type PillarPage = {
  slug: PillarRouteSlug;
  productId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  priceHint: string;
  primaryKeyword: string;
  ctaMessage: string;
  proof: string;
  benefits: string[];
  process: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedServiceIds: string[];
  featureImage?: FeatureImage;
  ctaLabel?: string;
};

export const pillarPages = allPillarPages satisfies PillarPage[];

export const pillarPagesBySlug = Object.fromEntries(
  pillarPages.map((page) => [page.slug, page]),
) as Record<PillarRouteSlug, PillarPage>;

export function getPillarPageByPath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;

  for (const page of pillarPages) {
    if (normalizedPath === `/${page.slug}/`) {
      return page;
    }
  }

  return undefined;
}
