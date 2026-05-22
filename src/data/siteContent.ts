export type LanguageCode = 'en' | 'es';

export type Product = {
  id: string;
  title: string;
  description: string;
  accent: string;
  previewUrl?: string;
  previewImage?: string;
  previewAlt?: string;
  previewVideoMp4?: string;
  previewVideoWebm?: string;
};

export type FieldContent = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'textarea';
  placeholder: string;
};

export type ContactChannel = {
  label: string;
  value: string;
  href: string;
};

export type LocalizedContent = {
  ariaLabels: {
    primaryNavigation: string;
    languageSwitcher: string;
    paletteSwitcher: string;
  };
  nav: Array<{ label: string; href: string }>;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    metrics: Array<{ value: string; label: string }>;
  };
  palette: {
    label: string;
    options: {
      current: string;
      atlantic: string;
      tropical: string;
      sunset: string;
      sand: string;
    };
  };
  products: Product[];
  banners: Array<{ eyebrow: string; title: string; body: string }>;
  sections: {
    services: { eyebrow: string; title: string; body: string };
    projects: { eyebrow: string; title: string; body: string };
    reviews: { eyebrow: string; title: string; body: string };
  };
  process: Array<{ title: string; body: string }>;
  processTitle: string;
  projects: Array<{
    name: string;
    type: string;
    result: string;
    features?: Array<{ label: string; included: boolean; emphasized?: boolean }>;
    badgeText?: string;
    featured?: boolean;
    ctaText?: string;
  }>;
  reviews: Array<{ quote: string; author: string; role: string }>;
  contact: {
    eyebrow: string;
    title: string;
    body: string;
    emailSubjectPrefix: string;
    submitLabel: string;
    successMessage: string;
    channels: ContactChannel[];
    fields: FieldContent[];
  };
  faqs: {
    eyebrow: string;
    title: string;
    body: string;
    items: Array<{ question: string; answer: string }>;
  };
  footer: {
    headline: string;
    body: string;
    rights: string;
  };
  bot: {
    eyebrow: string;
    title: string;
    body: string;
    badges: string[];
    trust: string;
    chatLabel: string;
    chatHint: string;
  };
};

export const siteContent = {
  brand: {
    name: 'Maiatesta',
    logoAlt: 'Maiatesta agencia digital en Quito',
    personaAlt: 'Maiatesta asistente digital para pymes en Quito',
    logo: '/assets/maiatesta-logo-optimized-2.jpg',
    persona: '/assets/maiatesta-persona-hero.webp',
    atlanticPersona: '/assets/maiatesta-persona-hero.webp',
    email: 'ventas@maiatesta.com',
  },
  languageSwitcher: {
    label: 'Language',
    options: [
      { code: 'en', label: 'EN' },
      { code: 'es', label: 'ES' },
    ] satisfies Array<{ code: LanguageCode; label: string }>,
  },
  locales: {
    en: {
      ariaLabels: {
        primaryNavigation: 'Primary navigation',
        languageSwitcher: 'Language selector',
        paletteSwitcher: 'Color palette selector',
      },
      nav: [
        { label: 'Services', href: '#services' },
        { label: 'Packages', href: '#projects' },
        { label: 'Contact', href: '#contact' },
      ],
      hero: {
        eyebrow: 'Accessible digital agency in Quito, Pichincha',
        title:
          'Websites, online stores, and automation for Quito small businesses.',
        body: 'Maiatesta helps local shops, restaurants, clinics, professionals, and growing SMEs in Quito Norte, Centro, Sur, and Pichincha get more leads online with clear, affordable web development, e-commerce, WhatsApp chatbots, inventory tools, custom software, and Excel automation.',
        primaryCta: 'Quote on WhatsApp',
        secondaryCta: 'Explore services',
        metrics: [
          { value: '24/7', label: 'AI-powered customer attention' },
          { value: '360°', label: 'web, software, commerce, and automation' },
          { value: 'ROI', label: 'technology applied to business results' },
        ],
      },
      palette: {
        label: 'Palette',
        options: {
          current: 'Current',
          atlantic: 'Atlantic',
          tropical: 'Tropical',
          sunset: 'Sunset',
          sand: 'Lagoon',
        },
      },
      products: [
        {
          id: 'web-development',
          title: 'Web Development in Quito',
          description:
            'Fast business websites and landing pages for entrepreneurs, service providers, and SMEs that need calls, WhatsApp leads, and local visibility.',
          accent: 'A clear website built to get leads',
          previewUrl: 'https://arquitectura.ltrueba.com/',
          previewImage: '/assets/previews/desarrollo-web-quito.webp',
          previewAlt: 'Static preview of a fast website for a Quito business',
          previewVideoMp4: '/assets/previews/videos/web-development-preview.mp4',
          previewVideoWebm:
            '/assets/previews/videos/web-development-preview.webm',
        },
        {
          id: 'e-commerce',
          title: 'E-Commerce for Ecuador',
          description:
            'Online stores with product catalog, cart, payment options, order management, social media links, and optional AI chat support.',
          accent: 'Sell online without overcomplicating it',
          previewUrl: 'https://my-winery-ecommerce-edjw7vlfl-ltp94.vercel.app/',
          previewImage: '/assets/previews/tienda-online-ecuador.webp',
          previewAlt: 'Static preview of an online store for Ecuador',
          previewVideoMp4: '/assets/previews/videos/ecommerce-preview.mp4',
          previewVideoWebm: '/assets/previews/videos/ecommerce-preview.webm',
        },
        {
          id: 'custom-software',
          title: 'Custom Software for SMEs',
          description:
            'Simple internal systems for schedules, bookings, dashboards, forms, reports, and daily processes that no spreadsheet handles well anymore.',
          accent: 'Turn your real workflow into a system',
          previewImage: '/assets/previews/videos/custom-software-poster.webp',
          previewAlt: 'Preview of custom software for SMEs in Ecuador',
          previewVideoMp4:
            '/assets/previews/videos/custom-software-preview.mp4',
          previewVideoWebm:
            '/assets/previews/videos/custom-software-preview.webm',
        },
        {
          id: 'inventory-software',
          title: 'Inventory Software',
          description:
            'Stock control for small warehouses, shops, restaurants, and distributors with entries, exits, alerts, reports, users, history, and traceability.',
          accent: 'Know what is available before it costs you',
          previewUrl: 'https://inventario.kipuxbot.com/recepcion/',
          previewImage: '/assets/previews/inventario-pymes-quito.webp',
          previewAlt: 'Static preview of inventory software for SMEs in Quito',
          previewVideoMp4: '/assets/previews/videos/inventory-preview.mp4',
          previewVideoWebm: '/assets/previews/videos/inventory-preview.webm',
        },
        {
          id: 'purchase-optimization',
          title: 'Purchasing and Cost Control',
          description:
            'Tools to compare suppliers, organize quotes, model savings, prioritize purchases, reduce costs, and keep budgets under control.',
          accent: 'Buy better with cleaner numbers',
          previewImage:
            '/assets/previews/videos/purchase-optimization-poster.webp',
          previewAlt: 'Preview of purchasing and cost control dashboards',
          previewVideoMp4:
            '/assets/previews/videos/purchase-optimization-preview.mp4',
          previewVideoWebm:
            '/assets/previews/videos/purchase-optimization-preview.webm',
        },
        {
          id: 'ai-automation',
          title: 'AI and WhatsApp Automation',
          description:
            'Web and WhatsApp chatbots with instant answers, lead capture, FAQs, customer follow-up, and appointment requests.',
          accent: 'Answer customers even outside business hours',
          previewImage: '/assets/previews/videos/ai-automation-poster.webp',
          previewAlt: 'Preview of AI and WhatsApp automation for SMEs',
          previewVideoMp4: '/assets/previews/videos/ai-automation-preview.mp4',
          previewVideoWebm:
            '/assets/previews/videos/ai-automation-preview.webm',
        },
        {
          id: 'spreadsheet-automation',
          title: 'Excel and Spreadsheet Automation',
          description:
            'Automated Excel files, dashboards, reports, data consolidation, and fewer manual mistakes in repeated administrative work.',
          accent: 'Stop rebuilding the same report every week',
          previewImage:
            '/assets/previews/videos/spreadsheet-automation-poster.webp',
          previewAlt: 'Preview of spreadsheet dashboards and automation',
          previewVideoMp4:
            '/assets/previews/videos/spreadsheet-automation-preview.mp4',
          previewVideoWebm:
            '/assets/previews/videos/spreadsheet-automation-preview.webm',
        },
      ],
      banners: [
        {
          eyebrow: 'Local digital execution',
          title: 'Useful systems for businesses that need leads, control, and faster response.',
          body: 'A practical layer of websites, automation, software, and reporting for small companies in Quito and Pichincha.',
        },
        {
          eyebrow: 'Space signal',
          title:
            'A quiet Milky Way separator keeps the page moving without adding media weight.',
          body: 'CSS-only visual transition for the space identity.',
        },
      ],
      sections: {
        services: {
          eyebrow: 'Services',
          title: 'Accessible digital services for SMEs in Quito.',
          body: 'Choose the service your business needs now: a professional website, online store, WhatsApp automation, inventory control, purchasing control, custom software, or spreadsheet automation.',
        },
        projects: {
          eyebrow: 'Packages',
          title:
            'Clear starting points for businesses that need results without enterprise budgets.',
          body: 'Start small with a website or chatbot, then add inventory, automation, and custom software when the operation needs it.',
        },
        reviews: {
          eyebrow: 'Why Maiatesta',
          title:
            'Modern solutions, personalized attention, and real automation.',
          body: 'We apply technology to the business itself: more sales opportunities, fewer manual tasks, cleaner information, and better results.',
        },
      },
      process: [
        { title: 'Listen', body: 'Understand what you sell, where your clients come from, and what slows your team down.' },
        { title: 'Prioritize', body: 'Choose the lowest-friction solution first: website, WhatsApp bot, store, Excel, inventory, or software.' },
        { title: 'Build', body: 'Create a fast, professional system with clear forms, integrations, reports, and business logic.' },
        { title: 'Launch', body: 'Publish, test on mobile, connect WhatsApp, and improve using real leads and operational data.' },
      ],
      processTitle: 'How projects move',
      projects: [
        {
          name: 'Express Website in Quito (from $200)',
          type: 'One-time payment',
          result:
            'A professional business website ready in 3 to 5 business days. One-time payment, mobile-first, and connected to your WhatsApp.',
          features: [
            {
              label: 'Professional, fast, and modern website.',
              included: true,
            },
            { label: 'Mobile-optimized design.', included: true },
            {
              label: 'Direct WhatsApp contact button.',
              included: true,
            },
            { label: 'Basic local SEO for Quito and Ecuador.', included: true },
            { label: 'Automatic customer attention.', included: false },
            { label: 'Database integration.', included: false },
          ],
          ctaText: 'Request a quick quote on WhatsApp.',
        },
        {
          name: 'AI WhatsApp Chatbot (from US$60)',
          type: 'Most Popular',
          result:
            'A virtual assistant for WhatsApp or your website that answers common questions and captures leads while you work.',
          badgeText: 'Most Popular',
          featured: true,
          features: [
            {
              label: 'Conversation flow for your service or product.',
              included: true,
              emphasized: true,
            },
            { label: 'Assistant bot for your business (24/7).', included: true },
            {
              label: 'Filters casual visitors and sends you only buyers.',
              included: true,
            },
            { label: 'Immediate replies with no waiting.', included: true },
            {
              label: 'Phone alerts for ready-to-buy customers.',
              included: true,
            },
            {
              label: 'Custom CRM or accounting connection.',
              included: false,
            },
          ],
          ctaText: 'Request a quick quote on WhatsApp.',
        },
        {
          name: 'Operational Control for SMEs',
          type: 'Custom software, inventory, and Excel',
          result:
            'Internal systems, dashboards, appointments, stock alerts, multi-user access, reports, history, and traceability for growing businesses.',
        },
      ],
      reviews: [
        {
          quote:
            'Technology should serve the business: more control, more sales opportunities, and fewer manual errors.',
          author: 'Maiatesta',
          role: 'Technology applied to business',
        },
        {
          quote:
            'Automation is useful when it answers customers, organizes information, and keeps operations moving 24/7.',
          author: 'Maiatesta',
          role: 'AI automation and operations',
        },
        {
          quote:
            'Better decisions start with cleaner data, smarter purchasing models, and systems that reveal what is happening.',
          author: 'Maiatesta',
          role: 'Dashboards and optimization',
        },
      ],
      contact: {
        eyebrow: 'Contact',
        title: 'Tell me what you need to sell, automate, or control in Quito.',
        body: 'Based in Quito, Ecuador. Ideal for SMEs, entrepreneurs, professionals, shops, restaurants, clinics, academies, and service businesses that need a practical digital solution.',
        emailSubjectPrefix: 'Project request from',
        submitLabel: 'Send request',
        successMessage:
          'Request prepared. Your email client is ready with the project details.',
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
            label: 'Service',
            type: 'select',
            placeholder: 'Choose a service',
          },
          {
            name: 'message',
            label: 'Business need',
            type: 'text',
            placeholder:
              'Example: chatbot for sales in Quito',
          },
        ],
      },
      faqs: {
        eyebrow: 'Local SEO questions',
        title: 'Common questions from businesses in Quito.',
        body: 'Short answers for owners comparing website, chatbot, e-commerce, inventory, and automation services before requesting a quote.',
        items: [
          {
            question: 'What is Maiatesta?',
            answer:
              'Maiatesta is a digital agency in Quito, Ecuador, focused on web development, SME software, WhatsApp chatbots, online stores, inventory tools, and AI automation.',
          },
          {
            question: 'How much does a business website cost in Quito?',
            answer:
              'An express website starts at $200, depending on the number of sections, copy, forms, WhatsApp buttons, SEO setup, and integrations. The goal is a fast first version that can generate leads quickly.',
          },
          {
            question: 'Do you work with businesses in Quito Norte, Centro, and Sur?',
            answer:
              'Yes. Maiatesta works with businesses across Quito and Pichincha, including Quito Norte, Centro, Sur, Cumbaya, Tumbaco, and Los Valles. Remote work is available when meetings are easier by WhatsApp or video call.',
          },
          {
            question: 'What is the fastest service if I need more leads?',
            answer:
              'For most local businesses, the fastest starting point is a focused landing page with WhatsApp contact, basic local SEO, and an optional chatbot that answers frequent questions and qualifies prospects.',
          },
          {
            question: 'Can I request only a WhatsApp chatbot or Excel automation?',
            answer:
              'Yes. You can start with a small automation, chatbot, report, or Excel tool without buying a full website or large software project.',
          },
        ],
      },
      footer: {
        headline: 'Maiatesta',
        body: 'Maiatesta is a digital agency in Quito, Ecuador, specialized in web development, SME software, and AI automation.',
        rights: 'All rights reserved.',
      },
      bot: {
        eyebrow: 'Kipux · Live AI',
        title: 'Describe your business and get a practical next step.',
        body: 'Use the assistant to explain what you sell, where you are in Quito, and what you need: a website, WhatsApp chatbot, online store, inventory, reports, or automation.',
        badges: ['Responds in seconds', 'Available 24/7', 'No commitment needed'],
        trust: 'A quick way to organize your idea before requesting a quote.',
        chatLabel: 'Open live chat',
        chatHint: 'Load the assistant only when you need it.',
      },
    },
    es: {
      ariaLabels: {
        primaryNavigation: 'Navegación principal',
        languageSwitcher: 'Selector de idioma',
        paletteSwitcher: 'Selector de paleta de colores',
      },
      nav: [
        { label: 'Servicios', href: '#services' },
        { label: 'Paquetes', href: '#projects' },
        { label: 'Contacto', href: '#contact' },
      ],
      hero: {
        eyebrow: 'Agencia digital accesible en Quito, Pichincha',
        title:
          'Páginas web, tiendas online y automatización para pymes de Quito.',
        body: 'Maiatesta ayuda a negocios, emprendimientos y profesionales en Quito Norte, Centro, Sur y Pichincha a conseguir más clientes por internet con desarrollo web accesible, e-commerce, chatbots para WhatsApp, inventario, software a medida y automatización de Excel.',
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
      },
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
          result:
            'Tu página web profesional lista en 3 a 5 días hábiles. Pago único, optimizada para celular y conectada a tu WhatsApp.',
          features: [
            { label: 'Web profesional, rápida y moderna.', included: true },
            { label: 'Diseño optimizado para celulares.', included: true },
            {
              label: 'Botón de contacto directo a tu WhatsApp.',
              included: true,
            },
            { label: 'SEO local básico para Quito y Ecuador.', included: true },
            { label: 'Atención automática a clientes.', included: false },
            { label: 'Integración con bases de datos.', included: false },
          ],
          ctaText: 'Pide una cotización rápida por WhatsApp.',
        },
        {
          name: 'Chatbot de WhatsApp con IA (desde US$ 60)',
          type: 'Más Popular',
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
            {
              label: 'Filtra curiosos y te envía solo compradores.',
              included: true,
            },
            { label: 'Respuestas inmediatas sin esperas.', included: true },
            {
              label: 'Alertas a tu celular de clientes listos.',
              included: true,
            },
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
            placeholder:
              'Ejemplo: chatbot para ventas en Quito',
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
    },
  } satisfies Record<LanguageCode, LocalizedContent>,
};
