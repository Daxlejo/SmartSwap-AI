import clsx from 'clsx';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { useTranslation } from '@/hooks/useTranslation';

export interface ThemeToggleProps {
  variant?: 'icon' | 'switch';
  className?: string;
  ariaLabel?: string;
}

export const ThemeToggle = ({
  variant = 'icon',
  className,
  ariaLabel,
}: ThemeToggleProps) => {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const label = ariaLabel ?? (isDark ? t('nav.switchToLight') : t('nav.switchToDark'));

  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={clsx(
          'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1',
          'transition-colors duration-300 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          isDark ? 'bg-primary-container' : 'bg-surface-container-highest',
          className,
        )}
      >
        <span
          className={clsx(
            'pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full shadow-sm',
            'transition-transform duration-300 ease-in-out',
            isDark
              ? 'translate-x-6 bg-primary text-on-primary'
              : 'translate-x-0 bg-surface-container-lowest text-on-surface',
          )}
        >
          <span className="relative flex items-center justify-center w-4 h-4 overflow-hidden">
            <span
              className={clsx(
                'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform',
                isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 text-amber-500',
              )}
            >
              <Icon name="light_mode" size="xs" filled />
            </span>
            <span
              className={clsx(
                'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform',
                isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
              )}
            >
              <Icon name="dark_mode" size="xs" filled />
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={clsx(
        'relative w-11 h-11 flex items-center justify-center rounded-full',
        'text-on-surface hover:bg-surface-container-high active:scale-95',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      <span className="relative flex items-center justify-center w-6 h-6 overflow-hidden">
        {/* Sun Icon (Light Mode) */}
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform',
            isDark
              ? 'rotate-90 scale-0 opacity-0 pointer-events-none'
              : 'rotate-0 scale-100 opacity-100 text-amber-500',
          )}
        >
          <Icon name="light_mode" size="lg" filled />
        </span>

        {/* Moon Icon (Dark Mode) */}
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform',
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-primary'
              : '-rotate-90 scale-0 opacity-0 pointer-events-none',
          )}
        >
          <Icon name="dark_mode" size="lg" filled />
        </span>
      </span>
    </button>
  );
};
