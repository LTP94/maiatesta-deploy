export const articleRouteSlugs = [
  'cuanto-cuesta-chatbot-whatsapp-ecuador',
  'pagina-web-negocio-pequeno-quito',
  'software-inventario-pymes-quito',
  'automatizar-reportes-excel-pyme',
  'cuanto-cuesta-software-a-medida-ecuador',
  'software-a-medida-vs-excel-pyme',
] as const;

export type ArticleRouteSlug = (typeof articleRouteSlugs)[number];

export function normalizeArticlePath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;
  const match = normalizedPath.match(/^\/guias\/([^/]+)\/$/);

  return match?.[1] as ArticleRouteSlug | undefined;
}
