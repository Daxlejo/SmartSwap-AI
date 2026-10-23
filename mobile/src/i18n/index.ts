import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { es } from './es';
import { en } from './en';

export const LANGUAGE_STORAGE_KEY = 'smartswap-language';

export const getInitialLanguage = (): string => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'es' || saved === 'en') {
      return saved;
    }
  } catch {
    // fallback if localStorage is unavailable
  }
  return 'es';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'es',
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
