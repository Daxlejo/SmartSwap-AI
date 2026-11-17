import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

export interface LanguageSelectorProps {
  /** Id of the visible label that names this group. */
  labelledBy: string;
}

/**
 * "Español | English" segmented selector. Each option is written in its own language so it
 * can be found by someone who does not read the current one; the choice is saved as
 * `smartswap_locale`.
 */
export const LanguageSelector = ({ labelledBy }: LanguageSelectorProps) => {
  const { language, changeLanguage } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      data-testid="language-selector"
      className="grid grid-cols-2 p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60"
    >
      {LANGUAGES.map(({ code, label }) => {
        const selected = language === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={code}
            onClick={() => {
              if (!selected) void changeLanguage(code);
            }}
            className={clsx(
              'min-h-12 rounded-xl font-label-lg text-label-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
