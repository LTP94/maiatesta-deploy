import type { LanguageCode } from './types';

export const brand = {
  name: 'Maiatesta',
  logoAlt: 'Maiatesta agencia digital en Quito',
  personaAlt: 'Maiatesta asistente digital para pymes en Quito',
  logo: '/assets/maiatesta-logo-optimized-2.jpg',
  persona: '/assets/maiatesta-persona-hero.webp',
  atlanticPersona: '/assets/maiatesta-persona-hero.webp',
  email: 'ventas@maiatesta.com',
};

export const languageSwitcher = {
  label: 'Language',
  options: [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
  ] satisfies Array<{ code: LanguageCode; label: string }>,
};
