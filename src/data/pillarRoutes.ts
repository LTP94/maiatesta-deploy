export const pillarRouteSlugs = [
  'desarrollo-de-software-quito',
] as const;

export type PillarRouteSlug = (typeof pillarRouteSlugs)[number];

export function normalizePillarPath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;

  for (const slug of pillarRouteSlugs) {
    if (normalizedPath === `/${slug}/`) {
      return slug;
    }
  }

  return undefined;
}
