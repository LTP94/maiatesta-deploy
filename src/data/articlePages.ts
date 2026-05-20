import type { ArticleRouteSlug } from './articleRoutes';

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

export const articlePages = [
  {
    slug: 'cuanto-cuesta-chatbot-whatsapp-ecuador',
    title: 'Cuánto cuesta un chatbot de WhatsApp en Ecuador',
    metaTitle: 'Cuánto Cuesta un Chatbot de WhatsApp en Ecuador | Maiatesta',
    metaDescription:
      'Guía clara de precios para chatbot de WhatsApp en Ecuador: desde US$60, qué incluye, qué sube el costo y cuándo conviene para una pyme.',
    h1: 'Cuánto cuesta un chatbot de WhatsApp en Ecuador y qué debe incluir',
    publishDate: '2026-05-19',
    updatedDate: '2026-05-19',
    primaryKeyword: 'cuánto cuesta un chatbot de WhatsApp en Ecuador',
    searchIntent:
      'Dueños de pymes comparando precio, alcance y utilidad antes de pedir una cotización.',
    excerpt:
      'Un chatbot de WhatsApp puede empezar desde US$60 si el flujo es básico. El precio sube cuando requiere IA avanzada, base de datos, CRM, pagos o lógica conectada a inventario.',
    sections: [
      {
        heading: 'Precio inicial realista',
        body: [
          'Para una pyme en Ecuador, un chatbot básico de WhatsApp puede empezar desde US$60 cuando el objetivo es responder preguntas frecuentes, pedir datos del cliente y derivar la conversación a una persona.',
          'Ese precio no debe prometer automatización total. Debe cubrir un flujo claro, mensajes ordenados, captura de datos mínimos y pruebas para que el negocio no pierda contactos por errores simples.',
        ],
      },
      {
        heading: 'Qué hace subir el costo',
        body: [
          'El costo sube cuando el chatbot necesita IA generativa, integración con CRM, inventario, catálogos, reservas, pagos, reportes o reglas especiales por tipo de cliente.',
          'También cambia si hay que diseñar muchos caminos de conversación. En negocios de Quito con servicios, reservas o catálogos grandes, conviene empezar por las preguntas más repetidas y medir.',
        ],
      },
      {
        heading: 'Cuándo conviene para una pyme',
        body: [
          'Conviene cuando llegan preguntas repetidas por WhatsApp sobre precios, horarios, ubicación, disponibilidad, citas o requisitos. En ese caso, el bot protege tiempo y evita que el cliente espere demasiado.',
          'No conviene si el negocio todavía no sabe qué preguntas recibe o si cada venta requiere una conversación totalmente personalizada. Primero se ordena el proceso, luego se automatiza.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Un chatbot de US$60 ya usa inteligencia artificial?',
        answer:
          'Puede incluir automatización básica y respuestas guiadas. Si se necesita IA generativa, entrenamiento de contexto o conexión con sistemas, el alcance debe cotizarse aparte.',
      },
      {
        question: '¿El chatbot puede enviar clientes listos a WhatsApp?',
        answer:
          'Sí. Puede capturar nombre, teléfono, servicio de interés y necesidad antes de avisar al negocio por WhatsApp o por otro canal definido.',
      },
      {
        question: '¿Funciona para negocios en Quito?',
        answer:
          'Sí. En Quito funciona bien para negocios que reciben muchas preguntas repetidas y necesitan responder rápido desde celular.',
      },
    ],
    relatedServiceIds: ['ai-automation', 'web-development', 'custom-software'],
    ctaMessage:
      'Hola Maiatesta, leí la guía de costos de chatbot de WhatsApp y quiero cotizar uno para mi empresa en Quito.',
  },
  {
    slug: 'pagina-web-negocio-pequeno-quito',
    title: 'Página web para negocio pequeño en Quito',
    metaTitle: 'Página Web para Negocio Pequeño en Quito | Guía Maiatesta',
    metaDescription:
      'Qué debe incluir una página web para un negocio pequeño en Quito: estructura, WhatsApp, SEO local, precio desde $200 y errores comunes.',
    h1: 'Qué debe incluir una página web para un negocio pequeño en Quito',
    publishDate: '2026-05-19',
    updatedDate: '2026-05-19',
    primaryKeyword: 'página web para negocio pequeño Quito',
    searchIntent:
      'Personas que necesitan una web accesible y quieren saber qué pedir antes de cotizar.',
    excerpt:
      'Una web para un negocio pequeño en Quito debe explicar la oferta, mostrar confianza, cargar rápido en celular y llevar al cliente a WhatsApp sin rodeos.',
    sections: [
      {
        heading: 'La web debe vender claridad',
        body: [
          'Para un negocio pequeño, la web no necesita parecer una plataforma enorme. Necesita explicar qué vendes, en qué zona atiendes, por qué confiar y cómo contactarte rápido.',
          'En Quito muchos clientes comparan desde celular. Por eso el botón de WhatsApp, el texto claro y la velocidad pesan más que una animación complicada.',
        ],
      },
      {
        heading: 'Elementos mínimos',
        body: [
          'La primera versión debería incluir una propuesta clara, servicios, zona de atención, beneficios, preguntas frecuentes, contacto por WhatsApp, correo y una base de SEO local.',
          'Si el negocio vende productos, puede empezar con catálogo o tienda online. Si vende servicios, una landing page bien escrita puede generar leads antes de invertir en algo más grande.',
        ],
      },
      {
        heading: 'Precio y alcance',
        body: [
          'Una página web express puede empezar desde $200 cuando el alcance es claro y no requiere funciones avanzadas. Formularios especiales, catálogo, reservas o integraciones aumentan el costo.',
          'Lo importante es no comprar una web genérica. Debe estar escrita para el cliente real del negocio y para búsquedas locales en Quito y Pichincha.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Una página web pequeña puede posicionar en Google?',
        answer:
          'Sí, si tiene contenido específico, buena velocidad, metadata, enlaces internos, schema y una intención clara. La competencia local también influye.',
      },
      {
        question: '¿Necesito blog desde el inicio?',
        answer:
          'No siempre. Primero conviene tener una página de servicio fuerte. Luego se pueden publicar guías para responder preguntas frecuentes de clientes.',
      },
      {
        question: '¿La web debe tener WhatsApp?',
        answer:
          'Para la mayoría de pymes en Ecuador, sí. WhatsApp reduce fricción y permite convertir visitas en conversaciones rápidas.',
      },
    ],
    relatedServiceIds: ['web-development', 'ai-automation', 'e-commerce'],
    ctaMessage:
      'Hola Maiatesta, leí la guía de página web para negocio pequeño en Quito y quiero cotizar una web.',
  },
  {
    slug: 'software-inventario-pymes-quito',
    title: 'Software de inventario para pymes en Quito',
    metaTitle: 'Software de Inventario para Pymes en Quito | Guía Maiatesta',
    metaDescription:
      'Guía para saber cuándo una pyme en Quito necesita software de inventario: señales, módulos mínimos, costos y errores de Excel.',
    h1: 'Cuándo una pyme en Quito necesita software de inventario',
    publishDate: '2026-05-19',
    updatedDate: '2026-05-19',
    primaryKeyword: 'software de inventario para pymes Quito',
    searchIntent:
      'Negocios que pierden control de stock y comparan si seguir con Excel o crear un sistema.',
    excerpt:
      'Una pyme necesita software de inventario cuando ya no sabe qué tiene, qué salió, quién movió productos o cuándo debe reponer stock.',
    sections: [
      {
        heading: 'Señales de que Excel ya no alcanza',
        body: [
          'Excel funciona al inicio, pero se vuelve frágil cuando varias personas editan, cuando hay muchas entradas y salidas o cuando el stock cambia todos los días.',
          'Si el negocio vende productos que no aparecen, compra de más, se queda sin stock o no puede revisar historial, ya existe un costo oculto.',
        ],
      },
      {
        heading: 'Módulos mínimos',
        body: [
          'Un sistema inicial debería tener productos, categorías, entradas, salidas, stock actual, alertas, historial, usuarios y reportes simples.',
          'No hace falta construir todo al mismo tiempo. Para pymes en Quito, suele ser mejor lanzar una versión útil y sumar compras, ventas o bodegas después.',
        ],
      },
      {
        heading: 'Cómo evitar un sistema demasiado grande',
        body: [
          'El error común es pedir todas las funciones posibles. La pregunta correcta es qué decisión mejora si el inventario está ordenado.',
          'Un buen MVP responde: cuánto stock hay, qué se movió, quién lo movió, cuándo reponer y qué productos generan problemas.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Puedo empezar desde mi archivo Excel actual?',
        answer:
          'Sí. El archivo actual puede servir como base para limpiar productos, categorías y stock inicial antes de pasar a un sistema.',
      },
      {
        question: '¿Un sistema de inventario sirve para restaurantes?',
        answer:
          'Sí, si se adapta a insumos, entradas, salidas, consumos y alertas. El flujo debe diseñarse según la operación real.',
      },
      {
        question: '¿Debe conectarse a ventas desde el inicio?',
        answer:
          'No necesariamente. Puede empezar como control de stock y luego conectarse a ventas, compras o reportes.',
      },
    ],
    relatedServiceIds: ['inventory-software', 'purchase-optimization', 'spreadsheet-automation'],
    ctaMessage:
      'Hola Maiatesta, leí la guía de software de inventario para pymes en Quito y quiero ordenar mi stock.',
  },
  {
    slug: 'automatizar-reportes-excel-pyme',
    title: 'Cómo automatizar reportes de Excel para una pyme',
    metaTitle: 'Cómo Automatizar Reportes de Excel para una Pyme | Maiatesta',
    metaDescription:
      'Guía para automatizar reportes de Excel en una pyme: qué procesos conviene automatizar, cuándo usar dashboards y cuándo pasar a software.',
    h1: 'Cómo automatizar reportes de Excel para una pyme sin complicar la operación',
    publishDate: '2026-05-19',
    updatedDate: '2026-05-19',
    primaryKeyword: 'automatizar reportes Excel pyme',
    searchIntent:
      'Administradores y dueños que pierden tiempo armando reportes repetitivos y buscan una solución práctica.',
    excerpt:
      'Automatizar reportes de Excel ayuda a reducir errores, ahorrar tiempo y tomar decisiones con datos más limpios sin construir software completo desde el primer día.',
    sections: [
      {
        heading: 'Qué reportes conviene automatizar',
        body: [
          'Conviene automatizar reportes que se repiten cada semana o mes, que copian datos de varias hojas o que suelen tener errores manuales.',
          'Ejemplos comunes son ventas, compras, inventario, cobranza, gastos, seguimiento comercial y reportes administrativos.',
        ],
      },
      {
        heading: 'Primer paso: limpiar el flujo',
        body: [
          'Antes de automatizar, hay que entender de dónde vienen los datos, quién los actualiza y qué decisión se toma con el reporte.',
          'Automatizar un archivo desordenado puede multiplicar errores. Primero se ordena la estructura; luego se automatizan cálculos, consolidación y visualización.',
        ],
      },
      {
        heading: 'Excel, dashboard o software',
        body: [
          'Si el problema es repetir reportes, Excel o Google Sheets automatizado puede bastar. Si hay usuarios, permisos, historial y procesos, conviene evaluar software.',
          'Para muchas pymes, la automatización de Excel es un paso intermedio económico antes de construir una plataforma más grande.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Se puede automatizar un archivo que ya existe?',
        answer:
          'Sí, pero primero hay que revisar estructura, fórmulas, datos duplicados y errores frecuentes para no automatizar problemas.',
      },
      {
        question: '¿Qué pasa si varias personas editan el Excel?',
        answer:
          'Puede usarse control de permisos, Google Sheets o un sistema web si el flujo multiusuario ya causa errores.',
      },
      {
        question: '¿Cuándo conviene pasar a software?',
        answer:
          'Cuando ya se necesitan usuarios, historial, roles, validaciones, trazabilidad o conexión con otros procesos del negocio.',
      },
    ],
    relatedServiceIds: ['spreadsheet-automation', 'custom-software', 'inventory-software'],
    ctaMessage:
      'Hola Maiatesta, leí la guía para automatizar reportes de Excel y quiero revisar mis reportes.',
  },
] satisfies ArticlePage[];

export const articlePagesBySlug = Object.fromEntries(
  articlePages.map((page) => [page.slug, page]),
) as Record<ArticleRouteSlug, ArticlePage>;

export function getArticlePageByPath(pathname: string) {
  const match = pathname.match(/^\/guias\/([^/]+)\/?$/);
  const slug = match?.[1] as ArticleRouteSlug | undefined;

  return slug ? articlePagesBySlug[slug] : undefined;
}
