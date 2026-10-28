import { useCallback } from 'react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import {
  preferencesStorage,
  type LocalePreference,
} from '@/services/storage/preferencesStorage';

export type SupportedLanguage = LocalePreference;

export const useTranslation = (ns?: string) => {
  const { t, i18n } = useI18nextTranslation(ns);

  const language: SupportedLanguage = i18n.language?.startsWith('en') ? 'en' : 'es';

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      preferencesStorage.setLocale(lang);
      await i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
    },
    [i18n],
  );

  return {
    t,
    i18n,
    language,
    changeLanguage,
  };
};
