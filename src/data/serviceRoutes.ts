export const serviceRouteSlugs = [
  'desarrollo-web-quito',
  'chatbots-whatsapp-ecuador',
  'software-inventario-quito',
  'software-a-medida-pymes-ecuador',
  'tiendas-online-ecuador',
  'automatizacion-excel-quito',
  'control-compras-costos-quito',
] as const;

export type ServiceRouteSlug = (typeof serviceRouteSlugs)[number];

export const serviceSlugByProductId = {
  'web-development': 'desarrollo-web-quito',
  'ai-automation': 'chatbots-whatsapp-ecuador',
  'inventory-software': 'software-inventario-quito',
  'custom-software': 'software-a-medida-pymes-ecuador',
  'e-commerce': 'tiendas-online-ecuador',
  'spreadsheet-automation': 'automatizacion-excel-quito',
  'purchase-optimization': 'control-compras-costos-quito',
} satisfies Record<string, ServiceRouteSlug>;

export function getServiceSlugForProductId(productId: string) {
  return serviceSlugByProductId[
    productId as keyof typeof serviceSlugByProductId
  ];
}

export function normalizeServicePath(pathname: string) {
  const normalizedPath = pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;
  const match = normalizedPath.match(/^\/servicios\/([^/]+)\/$/);

  return match?.[1] as ServiceRouteSlug | undefined;
}
