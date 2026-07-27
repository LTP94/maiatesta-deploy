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
    clients: { eyebrow: string; title: string; body: string };
    caseStudies: {
      eyebrow: string;
      title: string;
      body: string;
      realClientBadge: string;
      watchLabel: string;
    };
  };
  clients: Array<{
    name: string;
    sector: string;
    logo: string;
    alt: string;
    href: string;
    width: number;
    height: number;
  }>;
  caseStudyVideos: Array<{
    id: string;
    clientName: string;
    sector: string;
    href: string;
    posterImage: string;
    videoMp4: string;
    videoWebm: string;
    alt: string;
    durationLabel: string;
  }>;
  process: Array<{ title: string; body: string }>;
  processTitle: string;
  projects: Array<{
    name: string;
    type: string;
    result: string;
    image?: string;
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
