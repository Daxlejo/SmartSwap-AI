import { useCallback } from 'react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '@/i18n';

export type SupportedLanguage = 'es' | 'en';

export const useTranslation = (ns?: string) => {
  const { t, i18n } = useI18nextTranslation(ns);

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch (e) {
        console.warn('Unable to persist language preference:', e);
      }
      await i18n.changeLanguage(lang);
    },
    [i18n],
  );

  return {
    t,
    i18n,
    changeLanguage,
  };
};
