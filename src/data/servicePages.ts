import type { ServiceRouteSlug } from './serviceRoutes';
import { allServicePages } from './services/index';

export type FeatureImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type ServicePage = {
  slug: ServiceRouteSlug;
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

export const servicePages = allServicePages satisfies ServicePage[];

export const servicePagesBySlug = Object.fromEntries(
  servicePages.map((page) => [page.slug, page]),
) as Record<ServiceRouteSlug, ServicePage>;

export function getServicePageByPath(pathname: string) {
  const match = pathname.match(/^\/servicios\/([^/]+)\/?$/);
  const slug = match?.[1] as ServiceRouteSlug | undefined;

  return slug ? servicePagesBySlug[slug] : undefined;
}
