// Re-export all types so existing consumers keep working without any import path changes.
export type { LanguageCode, Product, FieldContent, ContactChannel, LocalizedContent } from './content/types';

import type { LanguageCode, LocalizedContent } from './content/types';
import { brand, languageSwitcher } from './content/brand';
import { enLocale } from './content/en';
import { esLocale } from './content/es';

export const siteContent = {
  brand,
  languageSwitcher,
  locales: {
    en: enLocale,
    es: esLocale,
  } satisfies Record<LanguageCode, LocalizedContent>,
};
