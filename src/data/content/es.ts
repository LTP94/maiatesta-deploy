import type { LocalizedContent } from './types';

export const esLocale: LocalizedContent = {
  ariaLabels: {
    primaryNavigation: 'Navegación principal',
    languageSwitcher: 'Selector de idioma',
    paletteSwitcher: 'Selector de paleta de colores',
  },
  nav: [
    { label: 'Software', href: '/desarrollo-de-software-quito/' },
    { label: 'Servicios', href: '#services' },
    { label: 'Paquetes', href: '#projects' },
    { label: 'Contacto', href: '#contact' },
  ],
  hero: {
    eyebrow: 'Agencia digital accesible en Quito, Pichincha',
    title:
      'Desarrollo de software, páginas web y automatización para pymes en Quito.',
    body: 'Creamos páginas web, tiendas online, software de inventario, sistemas a medida, chatbots de WhatsApp y automatizaciones de Excel para pymes en Quito y Ecuador que quieren vender más y operar con datos claros.',
    primaryCta: 'Cotizar por WhatsApp',
    secondaryCta: 'Ver servicios',
    metrics: [
      { value: '24/7', label: 'atención y oportunidades con IA' },
      { value: '360°', label: 'web, software, comercio y automatización' },
      { value: 'ROI', label: 'tecnología aplicada al negocio' },
    ],
  },
  palette: {
    label: 'Paleta',
    options: {
      current: 'Actual',
      atlantic: 'Atlantica',
      tropical: 'Tropical',
      sunset: 'Atardecer',
      sand: 'Laguna',
    },
  },
  products: [
    {
      id: 'web-development',
      title: 'Desarrollo Web en Quito',
      description: 'Páginas web y landing pages rápidas para negocios, profesionales y pymes que necesitan llamadas, WhatsApp y visibilidad local.',
      accent: 'Una web clara para captar clientes',
      previewUrl: 'https://arquitectura.ltrueba.com/',
      previewImage: '/assets/previews/desarrollo-web-quito.webp',
      previewAlt: 'Vista previa estática de una página web para negocio en Quito',
      previewVideoMp4: '/assets/previews/videos/web-development-preview.mp4',
      previewVideoWebm:
        '/assets/previews/videos/web-development-preview.webm',
    },
    {
      id: 'e-commerce',
      title: 'Tiendas Online en Ecuador',
      description: 'E-commerce con catálogo de productos, carrito, opciones de pago, gestión de pedidos, redes sociales y chat con IA opcional.',
      accent: 'Vende online sin complicarte',
      previewUrl: 'https://my-winery-ecommerce-edjw7vlfl-ltp94.vercel.app/',
      previewImage: '/assets/previews/tienda-online-ecuador.webp',
      previewAlt: 'Vista previa estática de una tienda online para Ecuador',
      previewVideoMp4: '/assets/previews/videos/ecommerce-preview.mp4',
      previewVideoWebm: '/assets/previews/videos/ecommerce-preview.webm',
    },
    {
      id: 'custom-software',
      title: 'Software a Medida para Pymes',
      description:
        'Sistemas simples para agendas, reservas, dashboards, formularios, reportes y procesos diarios que Excel ya no resuelve bien.',
      accent: 'Convierte tu proceso real en sistema',
      previewImage: '/assets/previews/videos/custom-software-poster.webp',
      previewAlt: 'Vista previa de software a medida para pymes en Ecuador',
      previewVideoMp4:
        '/assets/previews/videos/custom-software-preview.mp4',
      previewVideoWebm:
        '/assets/previews/videos/custom-software-preview.webm',
    },
    {
      id: 'inventory-software',
      title: 'Software de Inventario',
      description:
        'Control de stock para bodegas pequeñas, tiendas, restaurantes y distribuidores con entradas, salidas, alertas, reportes, usuarios e historial.',
      accent: 'Sabe qué tienes antes de que te cueste',
      previewUrl: 'https://inventario.kipuxbot.com/recepcion/',
      previewImage: '/assets/previews/inventario-pymes-quito.webp',
      previewAlt: 'Vista previa estática de software de inventario para pymes en Quito',
      previewVideoMp4: '/assets/previews/videos/inventory-preview.mp4',
      previewVideoWebm: '/assets/previews/videos/inventory-preview.webm',
    },
    {
      id: 'purchase-optimization',
      title: 'Control de Compras y Costos',
      description:
        'Herramientas para comparar proveedores, ordenar cotizaciones, modelar ahorros, priorizar compras, reducir costos y controlar presupuestos.',
      accent: 'Compra mejor con números claros',
      previewImage:
        '/assets/previews/videos/purchase-optimization-poster.webp',
      previewAlt: 'Vista previa de dashboards para control de compras y costos',
      previewVideoMp4:
        '/assets/previews/videos/purchase-optimization-preview.mp4',
      previewVideoWebm:
        '/assets/previews/videos/purchase-optimization-preview.webm',
    },
    {
      id: 'ai-automation',
      title: 'Automatización con IA y WhatsApp',
      description:
        'Chatbots web y WhatsApp con respuestas instantáneas, captura de leads, preguntas frecuentes, seguimiento y solicitudes de citas.',
      accent: 'Atiende clientes fuera de horario',
      previewImage: '/assets/previews/videos/ai-automation-poster.webp',
      previewAlt: 'Vista previa de automatización con IA y WhatsApp para pymes',
      previewVideoMp4: '/assets/previews/videos/ai-automation-preview.mp4',
      previewVideoWebm:
        '/assets/previews/videos/ai-automation-preview.webm',
    },
    {
      id: 'spreadsheet-automation',
      title: 'Automatización de Excel',
      description:
        'Excel inteligente, dashboards, reportes automáticos, consolidación de datos y menos errores manuales en tareas repetitivas.',
      accent: 'Deja de rehacer el mismo reporte cada semana',
      previewImage:
        '/assets/previews/videos/spreadsheet-automation-poster.webp',
      previewAlt: 'Vista previa de dashboards y automatización de Excel',
      previewVideoMp4:
        '/assets/previews/videos/spreadsheet-automation-preview.mp4',
      previewVideoWebm:
        '/assets/previews/videos/spreadsheet-automation-preview.webm',
    },
  ],
  banners: [
    {
      eyebrow: 'Ejecución digital local',
      title:
        'Sistemas útiles para negocios que necesitan clientes, control y respuesta rápida.',
      body: 'Una capa práctica de páginas web, automatización, software y reportes para pequeñas empresas en Quito y Pichincha.',
    },
    {
      eyebrow: 'Señal espacial',
      title:
        'Un separador tipo Vía Láctea mantiene el ritmo visual sin añadir peso multimedia.',
      body: 'Transición CSS-only para reforzar la identidad espacial.',
    },
  ],
  sections: {
    services: {
      eyebrow: 'Servicios',
      title: 'Servicios digitales accesibles para pymes en Quito.',
      body: 'Elige lo que tu negocio necesita ahora: página web profesional, tienda online, automatización de WhatsApp, inventario, control de compras, software a medida o automatización de Excel.',
    },
    projects: {
      eyebrow: 'Paquetes',
      title:
        'Puntos de partida claros para negocios sin presupuesto empresarial.',
      body: 'Empieza con una web o chatbot, y luego suma inventario, automatización y software a medida cuando la operación lo necesite.',
    },
    reviews: {
      eyebrow: 'Por qué Maiatesta',
      title:
        'Soluciones modernas, atención personalizada y automatización real.',
      body: 'Aplicamos tecnología al negocio: más oportunidades de venta, menos tareas manuales, información más clara y mejores resultados.',
    },
    clients: {
      eyebrow: 'Proyectos reales en Ecuador',
      title: 'Empresas y proyectos con los que hemos trabajado',
      body: 'Algunos proyectos donde hemos aplicado desarrollo web, automatización, software e integraciones para negocios en Ecuador.',
    },
  },
  clients: [
    {
      name: 'Largenergy',
      sector: 'Energía · Ecuador',
      logo: '/assets/clients/largenergy.webp',
      alt: 'Logo de Largenergy, empresa de energía en Ecuador',
      href: 'https://largenergy.com.ec',
      width: 360,
      height: 135,
    },
    {
      name: 'Estudio 10',
      sector: 'Estudio jurídico · Ecuador',
      logo: '/assets/clients/estudio-10.webp',
      alt: 'Logo de Estudio 10, estudio jurídico en Ecuador',
      href: 'https://www.estudio10.com.ec',
      width: 360,
      height: 167,
    },
    {
      name: 'La Pulga Picosa',
      sector: 'Tienda de segunda mano · Ecuador',
      logo: '/assets/clients/la-pulga-picosa.webp',
      alt: 'Logo de La Pulga Picosa, tienda de segunda mano en Ecuador',
      href: 'https://lapulgapicosa.kipuxbot.com',
      width: 360,
      height: 167,
    },
    {
      name: 'Galapagos Center',
      sector: 'Agencia de turismo · Ecuador',
      logo: '/assets/clients/galapagos-center.webp',
      alt: 'Logo de Galapagos Center, agencia de turismo en Ecuador',
      href: 'https://galapagoscenter.com',
      width: 360,
      height: 155,
    },
  ],
  process: [
    { title: 'Escuchar', body: 'Entiendo qué vendes, de dónde vienen tus clientes y qué frena tu operación.' },
    { title: 'Priorizar', body: 'Elegimos primero la solución de menor fricción: web, bot de WhatsApp, tienda, Excel, inventario o software.' },
    { title: 'Construir', body: 'Creo un sistema rápido y profesional con formularios, integraciones, reportes y lógica de negocio.' },
    { title: 'Lanzar', body: 'Publicamos, probamos en celular, conectamos WhatsApp y mejoramos con leads y datos reales.' },
  ],
  processTitle: 'Cómo avanza el proyecto',
  projects: [
    {
      name: 'Página Web Express en Quito (desde $200)',
      type: 'Pago único',
      image: '/assets/previews/package-web-express.webp',
      result:
        'Tu página web profesional lista en 3 a 5 días hábiles. Pago único, optimizada para celular y conectada a tu WhatsApp.',
      features: [
        { label: 'Web profesional, rápida y moderna.', included: true },
        { label: 'Diseño optimizado para celulares.', included: true },
        { label: 'Botón de contacto directo a tu WhatsApp.', included: true },
        { label: 'SEO local básico para Quito y Ecuador.', included: true },
        { label: 'Atención automática a clientes.', included: false },
        { label: 'Integración con bases de datos.', included: false },
      ],
      ctaText: 'Pide una cotización rápida por WhatsApp.',
    },
    {
      name: 'Chatbot de WhatsApp con IA (desde US$ 60)',
      type: 'Más Popular',
      image: '/assets/previews/package-web-chatbot.webp',
      result:
        'Un asistente virtual para WhatsApp o tu web que responde preguntas frecuentes y captura leads mientras trabajas.',
      badgeText: 'Más Popular',
      featured: true,
      features: [
        {
          label: 'Flujo de conversación para tu servicio o producto.',
          included: true,
          emphasized: true,
        },
        { label: 'Robot asistente para tu negocio (24/7).', included: true },
        { label: 'Filtra curiosos y te envía solo compradores.', included: true },
        { label: 'Respuestas inmediatas sin esperas.', included: true },
        { label: 'Alertas a tu celular de clientes listos.', included: true },
        {
          label: 'Conexión personalizada a CRM o sistema contable.',
          included: false,
        },
      ],
      ctaText: 'Pide una cotización rápida por WhatsApp.',
    },
    {
      name: 'Control Operativo para Pymes',
      type: 'Software a medida, inventario y Excel',
      image: '/assets/previews/package-full-digital.webp',
      result:
        'Sistemas internos, dashboards, agendas, alertas de stock, multiusuario, reportes, historial y trazabilidad para negocios en crecimiento.',
    },
  ],
  reviews: [
    {
      quote:
        'La tecnología debe servir al negocio: más control, más oportunidades de venta y menos errores manuales.',
      author: 'Maiatesta',
      role: 'Tecnología aplicada al negocio',
    },
    {
      quote:
        'La automatización es útil cuando atiende clientes, organiza información y mantiene la operación activa 24/7.',
      author: 'Maiatesta',
      role: 'Automatización con IA y operaciones',
    },
    {
      quote:
        'Decidir mejor empieza con datos más limpios, modelos de compra inteligentes y sistemas que muestran lo que ocurre.',
      author: 'Maiatesta',
      role: 'Dashboards y optimización',
    },
  ],
  contact: {
    eyebrow: 'Contacto',
    title: 'Cuéntame qué necesitas vender, automatizar o controlar en Quito.',
    body: 'Estoy en Quito, Ecuador. Ideal para pymes, emprendimientos, profesionales, tiendas, restaurantes, consultorios, academias y negocios de servicios que necesitan una solución digital práctica.',
    emailSubjectPrefix: 'Solicitud de proyecto de',
    submitLabel: 'Enviar solicitud',
    successMessage:
      'Solicitud preparada. Tu cliente de email está listo con los detalles del proyecto.',
    channels: [
      {
        label: 'Email',
        value: 'ventas@maiatesta.com',
        href: 'mailto:ventas@maiatesta.com',
      },
      {
        label: 'WhatsApp',
        value: '+593 963 092 859',
        href: 'https://wa.me/593963092859',
      },
      {
        label: 'LinkedIn',
        value: 'Maiatesta',
        href: 'https://www.linkedin.com/search/results/companies/?keywords=Maiatesta',
      },
      {
        label: 'Web',
        value: 'www.maiatesta.com',
        href: 'https://www.maiatesta.com',
      },
      {
        label: 'Instagram',
        value: 'maiatestatech',
        href: 'https://www.instagram.com/maiatestatech',
      },
    ],
    fields: [
      {
        name: 'whatsapp',
        label: 'WhatsApp',
        type: 'text',
        placeholder: '+593 99 999 9999',
      },
      {
        name: 'service',
        label: 'Servicio',
        type: 'select',
        placeholder: 'Elige un servicio',
      },
      {
        name: 'message',
        label: 'Necesidad del negocio',
        type: 'text',
        placeholder: 'Ejemplo: chatbot para ventas en Quito',
      },
    ],
  },
  faqs: {
    eyebrow: 'Preguntas locales',
    title: 'Preguntas comunes de negocios en Quito.',
    body: 'Respuestas cortas para dueños que comparan chatbot de WhatsApp, página web, tienda online, inventario y automatización antes de pedir una cotización.',
    items: [
      {
        question: '¿Qué es Maiatesta?',
        answer:
          'Maiatesta es una agencia digital en Quito, Ecuador, especializada en desarrollo web, software para pymes, chatbots de WhatsApp, tiendas online, inventario y automatización con IA.',
      },
      {
        question: '¿Cuánto cuesta un chatbot de WhatsApp en Ecuador?',
        answer:
          'Un chatbot básico para WhatsApp empieza desde US$60. El precio sube si necesita flujos avanzados, conexión a CRM, base de datos, inventario, facturación electrónica del SRI o integración con pagos.',
      },
      {
        question: '¿Sirve un chatbot con IA para una pyme de Quito?',
        answer:
          'Sí, si el negocio recibe preguntas repetidas por WhatsApp: horarios, precios, disponibilidad, reservas, ubicación, catálogo o seguimiento. En Quito funciona mejor como filtro de ventas, no como reemplazo total del trato humano.',
      },
      {
        question: '¿Puedo conectar mi tienda online con PayPhone o Kushki?',
        answer:
          'Sí. Para negocios en Ecuador se puede evaluar integración con botones de pago como PayPhone o pasarelas como Kushki, además de transferencia bancaria y contacto por WhatsApp para cerrar ventas más rápido.',
      },
      {
        question: '¿Un sistema a medida puede ayudar con facturación del SRI?',
        answer:
          'Sí. Un software puede preparar datos, órdenes, reportes y conexiones con proveedores de facturación electrónica. La emisión de comprobantes debe cumplir los requisitos del SRI y validarse según el caso del contribuyente.',
      },
      {
        question: '¿Qué es mejor para vender rápido: página web o chatbot?',
        answer:
          'Para volumen inmediato en Quito, lo más rentable suele ser una landing page simple con botón de WhatsApp y un chatbot que responda preguntas frecuentes. Primero se captura el lead; luego se mejora el sistema.',
      },
      {
        question: '¿Atiendes negocios del Norte, Centro y Sur de Quito?',
        answer:
          'Sí. Maiatesta trabaja con negocios en Quito y Pichincha, incluyendo Quito Norte, Centro, Sur, Cumbayá, Tumbaco y Los Valles. También se puede avanzar por WhatsApp o videollamada.',
      },
    ],
  },
  footer: {
    headline: 'Maiatesta',
    body: 'Maiatesta es una agencia digital en Quito, Ecuador, especializada en desarrollo web, software para pymes y automatización con IA.',
    rights: 'Todos los derechos reservados.',
  },
  bot: {
    eyebrow: 'Kipux · IA en vivo',
    title: 'Describe tu negocio y recibe un siguiente paso práctico.',
    body: 'Usa el asistente para explicar qué vendes, en qué sector de Quito estás y qué necesitas: web, chatbot de WhatsApp, tienda online, inventario, reportes o automatización.',
    badges: ['Responde en segundos', 'Disponible 24/7', 'Sin compromiso'],
    trust: 'Una forma rápida de ordenar tu idea antes de pedir cotización.',
    chatLabel: 'Abrir chat en vivo',
    chatHint: 'Carga el asistente solo cuando lo necesites.',
  },
};
