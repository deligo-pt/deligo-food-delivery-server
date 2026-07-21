// Supported languages tuple
export const SUPPORTED_LANGUAGES = ['en', 'pt'] as const;

// Global Language Type: 'en' | 'pt'
export type TLanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export type TLocalizedText = {
  en: string; // English
  pt: string; // Portuguese
};
