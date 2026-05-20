import type { ServiceRouteSlug } from './serviceRoutes';

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
};

export const servicePages = [
  {
    slug: 'desarrollo-web-quito',
    productId: 'web-development',
    title: 'Desarrollo web en Quito',
    metaTitle: 'Desarrollo Web en Quito | Páginas Web para Pymes | Maiatesta',
    metaDescription:
      'Maiatesta crea páginas web rápidas para pymes, profesionales y negocios en Quito. Web desde $200, SEO local, WhatsApp y diseño móvil.',
    h1: 'Desarrollo web en Quito para pymes que necesitan clientes por WhatsApp',
    intro:
      'Una página web útil no debe ser un adorno. Para negocios en Quito y Pichincha, la prioridad es aparecer bien, explicar rápido la oferta y llevar al visitante a WhatsApp sin fricción.',
    priceHint: 'Desde $200 para una página web express.',
    primaryKeyword: 'desarrollo web Quito',
    ctaMessage:
      'Hola Maiatesta, vi la página de desarrollo web en Quito y quiero cotizar una web para mi negocio.',
    proof:
      'Ideal para profesionales, restaurantes, consultorios, academias, tiendas y emprendimientos que necesitan una presencia clara antes de invertir en sistemas más grandes.',
    benefits: [
      'Estructura orientada a llamadas, formularios y WhatsApp.',
      'Copy local para Quito, Pichincha y servicios reales del negocio.',
      'Diseño responsive para clientes que comparan desde celular.',
      'Base técnica con SSG, metadata, schema y carga rápida.',
    ],
    process: [
      'Definir servicio, zona, público y objetivo principal.',
      'Crear estructura, textos, diseño y llamados a WhatsApp.',
      'Publicar, probar en móvil y dejar la página lista para Google Search Console.',
    ],
    faqs: [
      {
        question: '¿Cuánto cuesta una página web para un negocio en Quito?',
        answer:
          'Una página web express empieza desde $200. El precio cambia si necesita varias secciones, formularios avanzados, catálogo, reservas, automatizaciones o contenido adicional.',
      },
      {
        question: '¿La web queda conectada a WhatsApp?',
        answer:
          'Sí. La página puede incluir botones de WhatsApp con mensajes prellenados para que el cliente pida información, cotice o agende una llamada.',
      },
      {
        question: '¿Sirve para SEO local en Quito?',
        answer:
          'Sí. La estructura incluye títulos, contenido local, metadata, imágenes optimizadas y señales para que Google entienda el servicio y la ubicación.',
      },
    ],
    relatedServiceIds: ['ai-automation', 'e-commerce', 'custom-software'],
  },
  {
    slug: 'chatbots-whatsapp-ecuador',
    productId: 'ai-automation',
    title: 'Chatbots de WhatsApp en Ecuador',
    metaTitle: 'Chatbots de WhatsApp en Ecuador | IA para Pymes | Maiatesta',
    metaDescription:
      'Chatbots de WhatsApp con IA para pymes en Ecuador. Responde preguntas, captura leads y filtra clientes desde Quito con Maiatesta.',
    h1: 'Chatbots de WhatsApp en Ecuador para responder y captar clientes 24/7',
    intro:
      'En Ecuador muchas ventas empiezan por WhatsApp. Un chatbot bien diseñado ayuda a responder preguntas frecuentes, ordenar solicitudes y filtrar prospectos antes de que el cliente se enfríe.',
    priceHint: 'Desde US$60 para un flujo básico de chatbot.',
    primaryKeyword: 'chatbot WhatsApp Ecuador',
    ctaMessage:
      'Hola Maiatesta, vi la página de chatbots de WhatsApp y quiero automatizar la atención de mi empresa.',
    proof:
      'Funciona especialmente bien para negocios con preguntas repetidas sobre precios, horarios, ubicación, disponibilidad, reservas, catálogos o requisitos.',
    benefits: [
      'Atención inmediata incluso fuera de horario.',
      'Preguntas frecuentes, captura de datos y calificación de leads.',
      'Mensajes diseñados para el tono real del negocio.',
      'Posibilidad de conectar web, formularios, CRM o reportes según el caso.',
    ],
    process: [
      'Mapear las preguntas reales que llegan por WhatsApp.',
      'Diseñar el flujo de conversación y datos que se deben capturar.',
      'Probar respuestas, ajustar lenguaje y publicar el acceso desde web o WhatsApp.',
    ],
    faqs: [
      {
        question: '¿Cuánto cuesta un chatbot de WhatsApp en Ecuador?',
        answer:
          'Un chatbot básico empieza desde US$60. Si necesita IA avanzada, integraciones, base de datos, CRM, pagos o lógica de inventario, se cotiza según alcance.',
      },
      {
        question: '¿Un chatbot reemplaza a una persona?',
        answer:
          'No necesariamente. Para pymes suele funcionar mejor como primer filtro: responde lo repetitivo y deja los casos importantes listos para atención humana.',
      },
      {
        question: '¿Puede capturar leads para ventas?',
        answer:
          'Sí. Puede pedir nombre, teléfono, necesidad, zona, presupuesto aproximado o servicio de interés antes de enviar el contacto al equipo.',
      },
    ],
    relatedServiceIds: ['web-development', 'custom-software', 'e-commerce'],
  },
  {
    slug: 'software-inventario-quito',
    productId: 'inventory-software',
    title: 'Software de inventario en Quito',
    metaTitle: 'Software de Inventario en Quito | Control de Stock | Maiatesta',
    metaDescription:
      'Software de inventario para pymes en Quito: entradas, salidas, alertas, reportes, usuarios e historial para controlar stock.',
    h1: 'Software de inventario en Quito para controlar stock sin depender solo de Excel',
    intro:
      'Cuando el inventario vive en chats, hojas sueltas o memoria, el negocio pierde dinero. Un sistema simple ayuda a registrar entradas, salidas, alertas y reportes con trazabilidad.',
    priceHint: 'Cotización según módulos, usuarios y reportes necesarios.',
    primaryKeyword: 'software de inventario Quito',
    ctaMessage:
      'Hola Maiatesta, vi la página de software de inventario en Quito y quiero ordenar el stock de mi negocio.',
    proof:
      'Pensado para bodegas pequeñas, restaurantes, tiendas, distribuidores, repuestos, insumos, productos de alta rotación y negocios que ya sienten límites con Excel.',
    benefits: [
      'Control de entradas, salidas, ajustes e historial.',
      'Alertas de stock bajo y reportes para decidir compras.',
      'Usuarios y permisos según la operación.',
      'Base para conectar ventas, compras o dashboards más adelante.',
    ],
    process: [
      'Entender productos, movimientos, responsables y reportes actuales.',
      'Definir módulos mínimos para lanzar sin inflar el proyecto.',
      'Probar con datos reales y ajustar antes de usarlo en operación.',
    ],
    faqs: [
      {
        question: '¿Qué debe tener un software de inventario para una pyme?',
        answer:
          'Debe registrar productos, entradas, salidas, stock disponible, alertas, historial, usuarios y reportes claros. Lo importante es que encaje con el proceso real.',
      },
      {
        question: '¿Se puede migrar desde Excel?',
        answer:
          'Sí. Se puede partir de una hoja actual, limpiar datos básicos y convertirlos en un sistema más ordenado.',
      },
      {
        question: '¿Sirve para varias bodegas o sucursales?',
        answer:
          'Sí, si el alcance lo requiere. Se puede diseñar con ubicaciones, responsables y movimientos entre bodegas.',
      },
    ],
    relatedServiceIds: ['purchase-optimization', 'custom-software', 'spreadsheet-automation'],
  },
  {
    slug: 'software-a-medida-pymes-ecuador',
    productId: 'custom-software',
    title: 'Software a medida para pymes en Ecuador',
    metaTitle: 'Software a Medida para Pymes en Ecuador | Maiatesta',
    metaDescription:
      'Desarrollo de software a medida para pymes en Ecuador: reservas, dashboards, formularios, reportes, usuarios y procesos internos.',
    h1: 'Software a medida para pymes en Ecuador que necesitan ordenar su operación',
    intro:
      'No todo negocio necesita una plataforma enorme. Muchas pymes necesitan un sistema claro para reservas, formularios, reportes, agendas, usuarios o procesos que Excel ya no resuelve bien.',
    priceHint: 'Cotización por alcance, módulos y complejidad del flujo.',
    primaryKeyword: 'software a medida pymes Ecuador',
    ctaMessage:
      'Hola Maiatesta, vi la página de software a medida para pymes y quiero conversar sobre un sistema para mi operación.',
    proof:
      'El enfoque es empezar pequeño: resolver el cuello de botella más caro primero y crecer el sistema con datos reales del negocio.',
    benefits: [
      'Sistema adaptado al flujo real de la empresa.',
      'Paneles, usuarios, formularios y reportes según necesidad.',
      'Menos dependencia de hojas manuales y tareas repetidas.',
      'Arquitectura web para crecer con nuevos módulos.',
    ],
    process: [
      'Diagnóstico del proceso y definición del problema principal.',
      'Diseño del MVP operativo con pantallas y datos necesarios.',
      'Construcción, prueba con usuarios reales y ajustes de lanzamiento.',
    ],
    faqs: [
      {
        question: '¿Cuándo conviene software a medida?',
        answer:
          'Conviene cuando las herramientas genéricas obligan a duplicar trabajo, no reflejan tu proceso o no entregan reportes útiles para decidir.',
      },
      {
        question: '¿Se puede empezar con una versión pequeña?',
        answer:
          'Sí. Para pymes es mejor empezar con un MVP que resuelva una operación concreta antes de construir demasiadas funciones.',
      },
      {
        question: '¿Puede conectarse con otros sistemas?',
        answer:
          'Sí, dependiendo de las APIs disponibles. Se puede evaluar conexión con formularios, pagos, CRM, reportes, inventario o facturación.',
      },
    ],
    relatedServiceIds: ['inventory-software', 'spreadsheet-automation', 'ai-automation'],
  },
  {
    slug: 'tiendas-online-ecuador',
    productId: 'e-commerce',
    title: 'Tiendas online en Ecuador',
    metaTitle: 'Tiendas Online en Ecuador | E-commerce para Pymes | Maiatesta',
    metaDescription:
      'Tiendas online para pymes en Ecuador con catálogo, carrito, pedidos, WhatsApp, pagos y estructura móvil para vender sin complicarse.',
    h1: 'Tiendas online en Ecuador para vender con catálogo, pedidos y WhatsApp',
    intro:
      'Una tienda online para una pyme ecuatoriana debe facilitar la compra, no complicarla. El objetivo es mostrar productos, recibir pedidos y cerrar ventas por el canal que el cliente ya usa.',
    priceHint: 'Cotización según catálogo, pagos, pedidos e integraciones.',
    primaryKeyword: 'tienda online Ecuador',
    ctaMessage:
      'Hola Maiatesta, vi la página de tiendas online en Ecuador y quiero cotizar un e-commerce para mi negocio.',
    proof:
      'Útil para marcas, tiendas, productos de consumo, catálogos con variaciones, negocios que venden por Instagram y empresas que quieren ordenar pedidos.',
    benefits: [
      'Catálogo de productos claro y navegable desde celular.',
      'Carrito, pedidos y contacto directo por WhatsApp.',
      'Opciones para pagos, transferencia, PayPhone o Kushki según el caso.',
      'Estructura preparada para SEO y campañas futuras.',
    ],
    process: [
      'Definir catálogo, categorías, métodos de pago y flujo de pedido.',
      'Configurar tienda, productos clave y canales de contacto.',
      'Probar compra desde celular y publicar con analítica básica.',
    ],
    faqs: [
      {
        question: '¿Puedo vender con WhatsApp aunque tenga tienda online?',
        answer:
          'Sí. Para Ecuador suele funcionar muy bien combinar catálogo online con cierre por WhatsApp, especialmente al inicio.',
      },
      {
        question: '¿Se puede integrar PayPhone o Kushki?',
        answer:
          'Sí. Se puede evaluar integración con botones de pago, pasarelas disponibles, transferencia bancaria o pago contra entrega según el negocio.',
      },
      {
        question: '¿Necesito cargar todos mis productos desde el inicio?',
        answer:
          'No. Se puede empezar con los productos más rentables o más consultados y ampliar el catálogo por etapas.',
      },
    ],
    relatedServiceIds: ['web-development', 'ai-automation', 'inventory-software'],
  },
  {
    slug: 'automatizacion-excel-quito',
    productId: 'spreadsheet-automation',
    title: 'Automatización de Excel en Quito',
    metaTitle: 'Automatización de Excel en Quito | Reportes y Dashboards | Maiatesta',
    metaDescription:
      'Automatización de Excel en Quito para pymes: reportes, dashboards, consolidación de datos y menos tareas manuales repetitivas.',
    h1: 'Automatización de Excel en Quito para reportes y tareas repetitivas',
    intro:
      'Excel puede ser una gran herramienta, pero muchas empresas pierden horas copiando datos, armando reportes o corrigiendo errores manuales cada semana.',
    priceHint: 'Cotización según archivos, fuentes de datos y reportes.',
    primaryKeyword: 'automatización Excel Quito',
    ctaMessage:
      'Hola Maiatesta, vi la página de automatización de Excel en Quito y quiero automatizar reportes de mi negocio.',
    proof:
      'Funciona para administración, compras, inventario, ventas, finanzas, seguimiento comercial y reportes operativos que se repiten con frecuencia.',
    benefits: [
      'Menos copia manual y menos errores repetidos.',
      'Dashboards y reportes más fáciles de actualizar.',
      'Consolidación de datos desde varias hojas o archivos.',
      'Paso intermedio antes de construir software a medida.',
    ],
    process: [
      'Revisar archivos actuales, fórmulas y reportes críticos.',
      'Definir qué se automatiza y qué debe seguir siendo editable.',
      'Entregar archivo, dashboard o flujo probado con datos reales.',
    ],
    faqs: [
      {
        question: '¿Qué se puede automatizar en Excel?',
        answer:
          'Se pueden automatizar reportes, consolidación de archivos, dashboards, alertas, cálculos repetitivos, limpieza de datos y formatos de control.',
      },
      {
        question: '¿Siempre necesito software a medida?',
        answer:
          'No. Si el problema vive bien en hojas de cálculo, una automatización de Excel puede ser más rápida y económica.',
      },
      {
        question: '¿Se puede conectar con Google Sheets?',
        answer:
          'Sí. Según el flujo, se puede trabajar con Excel, Google Sheets o una combinación con reportes web.',
      },
    ],
    relatedServiceIds: ['custom-software', 'inventory-software', 'purchase-optimization'],
  },
  {
    slug: 'control-compras-costos-quito',
    productId: 'purchase-optimization',
    title: 'Control de compras y costos en Quito',
    metaTitle: 'Control de Compras y Costos en Quito | Dashboards para Pymes | Maiatesta',
    metaDescription:
      'Herramientas para control de compras y costos en Quito: proveedores, cotizaciones, presupuestos, ahorros, dashboards y reportes.',
    h1: 'Control de compras y costos en Quito para decidir con números claros',
    intro:
      'Comprar sin datos claros afecta caja, márgenes y operación. Una herramienta simple puede comparar proveedores, ordenar cotizaciones y mostrar dónde se está yendo el presupuesto.',
    priceHint: 'Cotización según reportes, proveedores y flujo de aprobación.',
    primaryKeyword: 'control de compras y costos Quito',
    ctaMessage:
      'Hola Maiatesta, vi la página de control de compras y costos y quiero ordenar compras en mi empresa.',
    proof:
      'Útil para negocios que comparan proveedores, compran insumos con frecuencia, manejan presupuestos o necesitan justificar decisiones de compra.',
    benefits: [
      'Comparación ordenada de proveedores y cotizaciones.',
      'Modelos simples de ahorro y priorización de compras.',
      'Dashboards para revisar costos, presupuestos y variaciones.',
      'Base para conectar inventario, Excel o software operativo.',
    ],
    process: [
      'Revisar cómo se cotiza, aprueba y registra cada compra.',
      'Definir indicadores mínimos: costo, proveedor, frecuencia, ahorro y presupuesto.',
      'Construir dashboard o sistema simple para seguimiento mensual.',
    ],
    faqs: [
      {
        question: '¿Qué problema resuelve un sistema de compras?',
        answer:
          'Ayuda a comparar proveedores, evitar compras impulsivas, controlar presupuesto y ver oportunidades de ahorro con datos más limpios.',
      },
      {
        question: '¿Puede empezar como dashboard?',
        answer:
          'Sí. Muchas pymes pueden empezar con un dashboard conectado a Excel antes de construir un sistema completo.',
      },
      {
        question: '¿Se puede conectar con inventario?',
        answer:
          'Sí. Compras e inventario suelen estar relacionados; se puede conectar stock bajo, proveedores y reposición según necesidad.',
      },
    ],
    relatedServiceIds: ['inventory-software', 'spreadsheet-automation', 'custom-software'],
  },
] satisfies ServicePage[];

export const servicePagesBySlug = Object.fromEntries(
  servicePages.map((page) => [page.slug, page]),
) as Record<ServiceRouteSlug, ServicePage>;

export function getServicePageByPath(pathname: string) {
  const match = pathname.match(/^\/servicios\/([^/]+)\/?$/);
  const slug = match?.[1] as ServiceRouteSlug | undefined;

  return slug ? servicePagesBySlug[slug] : undefined;
}
