import { z } from 'zod';

/** Language for AI-generated text. Spanish is the default; catalog values (categories) stay in Spanish. */
export const aiLocaleSchema = z.enum(['es', 'en']);

export type AiLocale = z.infer<typeof aiLocaleSchema>;

export const DEFAULT_AI_LOCALE: AiLocale = 'es';

/** Language name used inside the (Spanish) system prompts. */
export const AI_LOCALE_PROMPT_NAME: Record<AiLocale, string> = {
  es: 'español',
  en: 'inglés (English)',
};
