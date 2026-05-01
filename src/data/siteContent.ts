export type LanguageCode = 'en' | 'es';

export type Product = {
  id: string;
  title: string;
  description: string;
  accent: string;
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
  products: Product[];
  banners: Array<{ eyebrow: string; title: string; body: string }>;
  sections: {
    services: { eyebrow: string; title: string; body: string };
    projects: { eyebrow: string; title: string; body: string };
    reviews: { eyebrow: string; title: string; body: string };
  };
  process: string[];
  projects: Array<{ name: string; type: string; result: string }>;
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
  footer: {
    headline: string;
    body: string;
    rights: string;
  };
};

export const siteContent = {
  brand: {
    name: 'MaIAtesta',
    logoAlt: 'MaIAtesta agency logo',
    personaAlt: 'Malatesta AI persona',
    logo: '/assets/maiatesta-logo.jpg',
    persona: '/assets/malatesta-persona-invertido.jpg',
    heroVideo: '/assets/maiatesta-page-bg.mp4',
    pageBackgroundVideo: '/assets/maiatesta-page-bg.mp4',
    email: 'maiatesta@gmail.com',
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
      },
      nav: [
        { label: 'Services', href: '#services' },
        { label: 'Solutions', href: '#projects' },
        { label: 'Why us', href: '#reviews' },
        { label: 'Contact', href: '#contact' },
      ],
      hero: {
        eyebrow: 'Intelligent technology for profitable growth',
        title:
          'Digital solutions that increase sales, automate operations, and improve decisions.',
        body: 'MAIAtesta designs smart websites, e-commerce, custom software, inventory tools, mathematical purchasing optimization, AI automation, and spreadsheet automation for businesses ready to grow.',
        primaryCta: 'Contact MAIAtesta',
        secondaryCta: 'Explore services',
        metrics: [
          { value: '24/7', label: 'AI-powered customer attention' },
          { value: '360°', label: 'web, software, commerce, and automation' },
          { value: 'ROI', label: 'technology applied to business results' },
        ],
      },
      products: [
        {
          id: 'web-development',
          title: 'Web Development',
          description:
            'Modern, fast, professional websites: corporate sites, landing pages, portfolios, forms, WhatsApp, and integrated AI.',
          accent: 'Strengthen your digital presence',
        },
        {
          id: 'e-commerce',
          title: 'E-Commerce',
          description:
            'Online stores ready to sell with product catalog, cart, online payments, order management, social networks, and organic AI chats.',
          accent: 'Sell online with less friction',
        },
        {
          id: 'custom-software',
          title: 'Custom Software',
          description:
            'Tailored systems for your company: internal platforms, dashboards, reservations, scheduling, and operational automation.',
          accent: 'Build around your real process',
        },
        {
          id: 'inventory-software',
          title: 'Inventory Software',
          description:
            'Smart stock control with entries, exits, low-inventory alerts, automatic reports, multi-user access, history, and traceability.',
          accent: 'Control stock with intelligence',
        },
        {
          id: 'purchase-optimization',
          title: 'Purchasing Optimization',
          description:
            'Mathematical software to compare suppliers, model savings, prioritize purchases, reduce costs, and control budgets.',
          accent: 'Buy better and reduce costs',
        },
        {
          id: 'ai-automation',
          title: 'AI Automation',
          description:
            'Web and WhatsApp chatbots with instant replies, lead capture, FAQs, customer follow-up, and automated scheduling.',
          accent: 'Generate opportunities 24/7',
        },
        {
          id: 'spreadsheet-automation',
          title: 'Spreadsheet Automation',
          description:
            'Smart Excel, automatic reports, data consolidation, and reduction of manual errors in repetitive processes.',
          accent: 'Turn repetitive work into systems',
        },
      ],
      banners: [
        {
          eyebrow: 'MAIAtesta signal',
          title: 'Digital systems with a premium graphite and bronze identity.',
          body: 'A sharper visual layer for services that connect sales, operations, AI, and business control.',
        },
        {
          eyebrow: 'Intelligent execution',
          title:
            'Automation, software, and commerce moving under one visual language.',
          body: 'From first contact to operational dashboards, each solution keeps the brand precise, luminous, and measurable.',
        },
      ],
      sections: {
        services: {
          eyebrow: 'Services',
          title: 'Technology designed to grow and monetize your business.',
          body: 'Choose the MaIAtesta solution your business needs now: sales, operations, inventory, purchasing, AI customer attention, or process automation.',
        },
        projects: {
          eyebrow: 'Solutions',
          title:
            'Digital systems focused on sales, control, and better decisions.',
          body: 'From the first website to custom business software, each solution is built to create measurable operational and commercial impact.',
        },
        reviews: {
          eyebrow: 'Why MaIAtesta',
          title:
            'Modern solutions, personalized attention, and real automation.',
          body: 'We apply technology to the business itself: more sales opportunities, fewer manual tasks, cleaner information, and better results.',
        },
      },
      process: [
        'Understand your sales, operations, inventory, purchasing, and reporting needs.',
        'Design the right digital solution: web, commerce, custom software, AI, or automation.',
        'Build fast, professional systems with clear forms, integrations, dashboards, and business logic.',
        'Launch, measure, and improve results with automation, reports, and better decision tools.',
      ],
      projects: [
        {
          name: 'Smart Web Presence',
          type: 'Web development',
          result:
            'Corporate pages, landing pages, professional portfolios, forms, WhatsApp, and AI integration for stronger digital visibility.',
        },
        {
          name: 'Sales Engine',
          type: 'E-commerce and AI chats',
          result:
            'Online stores with catalog, cart, payments, order management, social integration, and automated organic conversations.',
        },
        {
          name: 'Operations Control',
          type: 'Custom software and inventory',
          result:
            'Internal systems, dashboards, scheduling, stock alerts, multi-user access, reports, history, and traceability.',
        },
      ],
      reviews: [
        {
          quote:
            'Technology should serve the business: more control, more sales opportunities, and fewer manual errors.',
          author: 'MaIAtesta',
          role: 'Technology applied to business',
        },
        {
          quote:
            'Automation is useful when it answers customers, organizes information, and keeps operations moving 24/7.',
          author: 'MaIAtesta',
          role: 'AI automation and operations',
        },
        {
          quote:
            'Better decisions start with cleaner data, smarter purchasing models, and systems that reveal what is happening.',
          author: 'MaIAtesta',
          role: 'Dashboards and optimization',
        },
      ],
      contact: {
        eyebrow: 'Contact',
        title: 'Tell us what you want to improve, automate, or sell.',
        body: '',
        emailSubjectPrefix: 'Project request from',
        submitLabel: 'Send request',
        successMessage:
          'Request prepared. Your email client is ready with the project details.',
        channels: [
          {
            label: 'Email',
            value: 'maiAtesta@gmail.com',
            href: 'mailto: maiAtesta@gmail.com',
          },
          {
            label: 'WhatsApp',
            value: '+593 963 092 859',
            href: 'https://wa.me/593963092859',
          },
          {
            label: 'LinkedIn',
            value: 'MaiAtesta',
            href: 'https://www.linkedin.com/search/results/companies/?keywords=MaiAtesta',
          },
          {
            label: 'Web',
            value: 'www.maiAtesta.com',
            href: 'https://www.maiAtesta.com',
          },
          {
            label: 'Instagram',
            value: 'maiatestatech',
            href: 'https://www.instagram.com/maiatestatech',
          },
        ],
        fields: [
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            placeholder: 'Your name',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'you@company.com',
          },
          {
            name: 'company',
            label: 'Company',
            type: 'text',
            placeholder: 'Company or brand',
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
            type: 'textarea',
            placeholder:
              'What do you want to sell, automate, control, or optimize?',
          },
        ],
      },
      footer: {
        headline: 'MaIAtesta',
        body: 'Intelligent technology to grow and monetize your business.',
        rights: 'All rights reserved.',
      },
    },
    es: {
      ariaLabels: {
        primaryNavigation: 'Navegación principal',
        languageSwitcher: 'Selector de idioma',
      },
      nav: [
        { label: 'Servicios', href: '#services' },
        { label: 'Soluciones', href: '#projects' },
        { label: 'Por qué', href: '#reviews' },
        { label: 'Contacto', href: '#contact' },
      ],
      hero: {
        eyebrow: 'Tecnología inteligente para crecer y rentabilizar tu negocio',
        title:
          'Soluciones digitales que aumentan ventas, automatizan operaciones y mejoran decisiones.',
        body: 'MaIAtesta diseña desarrollo web, e-commerce, software a medida, inventario inteligente, optimización matemática de compras, automatización con IA y automatización de planillas para empresas listas para crecer.',
        primaryCta: 'Contactar MaIAtesta',
        secondaryCta: 'Ver servicios',
        metrics: [
          { value: '24/7', label: 'atención y oportunidades con IA' },
          { value: '360°', label: 'web, software, comercio y automatización' },
          { value: 'ROI', label: 'tecnología aplicada al negocio' },
        ],
      },
      products: [
        {
          id: 'web-development',
          title: 'Desarrollo Web',
          description:
            'Páginas modernas, rápidas y profesionales: sitios corporativos, landing pages, portafolios, formularios, WhatsApp e IA integrada.',
          accent: 'Fortalece tu presencia digital',
        },
        {
          id: 'e-commerce',
          title: 'E-Commerce',
          description:
            'Tiendas online listas para vender con catálogo, carrito, pagos en línea, gestión de pedidos, redes sociales y chats con IA.',
          accent: 'Vende online con menos fricción',
        },
        {
          id: 'custom-software',
          title: 'Software a Medida',
          description:
            'Sistemas personalizados para tu empresa: plataformas internas, dashboards, reservas, agendas y automatización operativa.',
          accent: 'Construye sobre tu proceso real',
        },
        {
          id: 'inventory-software',
          title: 'Inventario',
          description:
            'Control inteligente de stock con entradas, salidas, alertas de bajo inventario, reportes automáticos, multiusuario, historial y trazabilidad.',
          accent: 'Controla stock con inteligencia',
        },
        {
          id: 'purchase-optimization',
          title: 'Optimización de Compras',
          description:
            'Software matemático para comparar proveedores, modelar ahorros, priorizar compras, reducir costos y controlar presupuestos.',
          accent: 'Compra mejor y reduce costos',
        },
        {
          id: 'ai-automation',
          title: 'Automatización con IA',
          description:
            'Chatbots web y WhatsApp con respuestas instantáneas, captura de clientes potenciales, preguntas frecuentes, seguimiento y agendamiento.',
          accent: 'Genera oportunidades 24/7',
        },
        {
          id: 'spreadsheet-automation',
          title: 'Planillas Inteligentes',
          description:
            'Excel inteligente, reportes automáticos, consolidación de datos y reducción de errores manuales en procesos repetitivos.',
          accent: 'Convierte tareas repetitivas en sistemas',
        },
      ],
      banners: [
        {
          eyebrow: 'Señal MAIAtesta',
          title:
            'Sistemas digitales con una identidad grafito y bronce premium.',
          body: 'Una capa visual más precisa para servicios que conectan ventas, operaciones, IA y control del negocio.',
        },
        {
          eyebrow: 'Ejecución inteligente',
          title:
            'Automatización, software y comercio bajo un mismo lenguaje visual.',
          body: 'Desde el primer contacto hasta dashboards operativos, cada solución mantiene la marca precisa, luminosa y medible.',
        },
      ],
      sections: {
        services: {
          eyebrow: 'Servicios',
          title: 'Tecnología diseñada para crecer y rentabilizar tu negocio.',
          body: 'Elige la solución MaIAtesta que tu empresa necesita ahora: ventas, operaciones, inventario, compras, atención con IA o automatización de procesos.',
        },
        projects: {
          eyebrow: 'Soluciones',
          title:
            'Sistemas digitales enfocados en ventas, control y mejores decisiones.',
          body: 'Desde la primera página web hasta software empresarial a medida, cada solución se diseña para generar impacto operativo y comercial medible.',
        },
        reviews: {
          eyebrow: 'Por qué MaIAtesta',
          title:
            'Soluciones modernas, atención personalizada y automatización real.',
          body: 'Aplicamos tecnología al negocio: más oportunidades de venta, menos tareas manuales, información más clara y mejores resultados.',
        },
      },
      process: [
        'Entendemos tus necesidades de ventas, operaciones, inventario, compras y reportes.',
        'Diseñamos la solución digital adecuada: web, comercio, software a medida, IA o automatización.',
        'Construimos sistemas rápidos y profesionales con formularios, integraciones, dashboards y lógica de negocio.',
        'Lanzamos, medimos y mejoramos resultados con automatización, reportes y mejores herramientas de decisión.',
      ],
      projects: [
        {
          name: 'Presencia Web Inteligente',
          type: 'Desarrollo web',
          result:
            'Páginas corporativas, landing pages, portafolios profesionales, formularios, WhatsApp e integración con IA para fortalecer tu visibilidad digital.',
        },
        {
          name: 'Motor de Ventas',
          type: 'E-commerce y chats con IA',
          result:
            'Tiendas online con catálogo, carrito, pagos, gestión de pedidos, integración social y conversaciones orgánicas automatizadas.',
        },
        {
          name: 'Control Operativo',
          type: 'Software a medida e inventario',
          result:
            'Sistemas internos, dashboards, agendas, alertas de stock, multiusuario, reportes, historial y trazabilidad.',
        },
      ],
      reviews: [
        {
          quote:
            'La tecnología debe servir al negocio: más control, más oportunidades de venta y menos errores manuales.',
          author: 'MaIAtesta',
          role: 'Tecnología aplicada al negocio',
        },
        {
          quote:
            'La automatización es útil cuando atiende clientes, organiza información y mantiene la operación activa 24/7.',
          author: 'MaIAtesta',
          role: 'Automatización con IA y operaciones',
        },
        {
          quote:
            'Decidir mejor empieza con datos más limpios, modelos de compra inteligentes y sistemas que muestran lo que ocurre.',
          author: 'MaIAtesta',
          role: 'Dashboards y optimización',
        },
      ],
      contact: {
        eyebrow: 'Contacto',
        title: 'Cuéntanos qué quieres mejorar, automatizar o vender.',
        body: '',
        emailSubjectPrefix: 'Solicitud de proyecto de',
        submitLabel: 'Enviar solicitud',
        successMessage:
          'Solicitud preparada. Tu cliente de email está listo con los detalles del proyecto.',
        channels: [
          {
            label: 'Email',
            value: 'maiatesta@gmail.com',
            href: 'mailto:maiatesta@gmail.com',
          },
          {
            label: 'WhatsApp',
            value: '+593 963 092 859',
            href: 'https://wa.me/593963092859',
          },
          {
            label: 'LinkedIn',
            value: 'MaiAtesta',
            href: 'https://www.linkedin.com/search/results/companies/?keywords=MaiAtesta',
          },
          {
            label: 'Web',
            value: 'www.maiAtesta.com',
            href: 'https://www.maiAtesta.com',
          },
          {
            label: 'Instagram',
            value: 'maiatestatech',
            href: 'https://www.instagram.com/maiatestatech',
          },
        ],
        fields: [
          {
            name: 'name',
            label: 'Nombre',
            type: 'text',
            placeholder: 'Tu nombre',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'tu@empresa.com',
          },
          {
            name: 'company',
            label: 'Empresa',
            type: 'text',
            placeholder: 'Empresa o marca',
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
            type: 'textarea',
            placeholder:
              '¿Qué quieres vender, automatizar, controlar u optimizar?',
          },
        ],
      },
      footer: {
        headline: 'MaIAtesta',
        body: 'Tecnología inteligente para crecer y rentabilizar tu negocio.',
        rights: 'Todos los derechos reservados.',
      },
    },
  } satisfies Record<LanguageCode, LocalizedContent>,
};
