import type { ArticleRouteSlug } from './articleRoutes';
import { allArticlePages } from './articles/index';

export type ArticleSection = {
  heading: string;
  body: string[];
};

export type ArticlePage = {
  slug: ArticleRouteSlug;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  publishDate: string;
  updatedDate: string;
  primaryKeyword: string;
  searchIntent: string;
  excerpt: string;
  sections: ArticleSection[];
  faqs: Array<{ question: string; answer: string }>;
  relatedServiceIds: string[];
  ctaMessage: string;
};

export const articlePages = allArticlePages satisfies ArticlePage[];

export const articlePagesBySlug = Object.fromEntries(
  articlePages.map((page) => [page.slug, page]),
) as Record<ArticleRouteSlug, ArticlePage>;

export function getArticlePageByPath(pathname: string) {
  const match = pathname.match(/^\/guias\/([^/]+)\/?$/);
  const slug = match?.[1] as ArticleRouteSlug | undefined;

  return slug ? articlePagesBySlug[slug] : undefined;
}
