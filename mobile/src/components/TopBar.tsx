import { useNavigate } from 'react-router-dom';
import { Icon } from './ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export interface TopBarProps {
  title: string;
  onBack?: () => void;
}

/**
 * Fixed bar of the secondary screens (the ones without BottomNav): a back arrow
 * and the title. The four main tabs have no top bar (see ScreenHeader). Its row is
 * `--topbar-h` tall (index.css), the same value `.top-below-header` uses so sticky
 * elements line up under it. Titles are short and may wrap to two lines instead of
 * being cut.
 */
export const TopBar = ({ title, onBack }: TopBarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Opened straight on this screen (no history inside the app): go to Home instead of nowhere
      const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (historyIndex > 0) navigate(-1);
      else navigate('/home', { replace: true });
    }
  };

  return (
    <header className="sticky top-0 w-full z-40 shrink-0 pt-safe bg-surface border-b border-surface-container-high">
      <div className="min-h-[var(--topbar-h)] px-margin flex items-center gap-space-xs max-w-md mx-auto">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t('nav.back')}
          className="w-11 h-11 -ml-2 shrink-0 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon name="arrow_back" size="lg" />
        </button>
        <h1 className="min-w-0 font-headline-sm text-headline-sm leading-tight font-bold text-on-surface line-clamp-2 break-words">
          {title}
        </h1>
      </div>
    </header>
  );
};
