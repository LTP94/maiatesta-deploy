import type { LocalizedContent } from './types';

export const enLocale: LocalizedContent = {
  ariaLabels: {
    primaryNavigation: 'Primary navigation',
    languageSwitcher: 'Language selector',
    paletteSwitcher: 'Color palette selector',
  },
  nav: [
    { label: 'Software', href: '/desarrollo-de-software-quito/' },
    { label: 'Services', href: '#services' },
    { label: 'Packages', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ],
  hero: {
    eyebrow: 'Accessible digital agency in Quito, Pichincha',
    title:
      'Software development, websites, and automation for SMEs in Quito.',
    body: 'We build inventory software, online stores, WhatsApp chatbots, websites, and automations for businesses that want to sell more and streamline operations.',
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
    clients: {
      eyebrow: 'Proyectos reales en Ecuador',
      title: 'Empresas y proyectos con los que hemos trabajado',
      body: 'Algunos proyectos donde hemos aplicado desarrollo web, automatización, software e integraciones para negocios en Ecuador.',
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
      image: '/assets/previews/package-web-express.webp',
      result:
        'A professional business website ready in 3 to 5 business days. One-time payment, mobile-first, and connected to your WhatsApp.',
      features: [
        { label: 'Professional, fast, and modern website.', included: true },
        { label: 'Mobile-optimized design.', included: true },
        { label: 'Direct WhatsApp contact button.', included: true },
        { label: 'Basic local SEO for Quito and Ecuador.', included: true },
        { label: 'Automatic customer attention.', included: false },
        { label: 'Database integration.', included: false },
      ],
      ctaText: 'Request a quick quote on WhatsApp.',
    },
    {
      name: 'AI WhatsApp Chatbot (from US$60)',
      type: 'Most Popular',
      image: '/assets/previews/package-web-chatbot.webp',
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
        { label: 'Phone alerts for ready-to-buy customers.', included: true },
        { label: 'Custom CRM or accounting connection.', included: false },
      ],
      ctaText: 'Request a quick quote on WhatsApp.',
    },
    {
      name: 'Operational Control for SMEs',
      type: 'Custom software, inventory, and Excel',
      image: '/assets/previews/package-full-digital.webp',
      result:
        'Internal systems, dashboards, appointments, stock alerts, multi-user access, reports, history, and traceability for growing businesses.',
    },
  ],
  clients: [],
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
        placeholder: 'Example: chatbot for sales in Quito',
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
};
