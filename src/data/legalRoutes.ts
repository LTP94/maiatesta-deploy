export const legalRouteSlugs = [
  'politica-de-privacidad',
  'terminos',
  'eliminacion-de-datos',
] as const;

export type LegalRouteSlug = (typeof legalRouteSlugs)[number];

export function normalizeLegalPath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;

  for (const slug of legalRouteSlugs) {
    if (normalizedPath === `/${slug}/`) {
      return slug;
    }
  }

  return undefined;
}
