import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { useApp } from '@/context/AppContext';
import { Icon } from './ui/Icon';
import { Avatar } from './ui/Avatar';
import { ThemeToggle } from './ui/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';

export interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  showProfile?: boolean;
  /** Compact theme toggle; AppLayout shows it on Home. Profile has the full setting. */
  showThemeToggle?: boolean;
}

/**
 * Its row is `--topbar-h` tall (index.css), the same value `.top-below-header` uses
 * so sticky elements line up under it. Titles are short and may wrap to two lines
 * instead of being cut.
 */
export const TopBar = ({
  title,
  showBack = false,
  onBack,
  showNotifications = true,
  showProfile = false,
  showThemeToggle = false,
}: TopBarProps) => {
  const navigate = useNavigate();
  const { currentUser, unreadNotificationsCount } = useApp();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 w-full z-40 shrink-0 pt-safe bg-surface border-b border-surface-container-high">
      <div className="h-[var(--topbar-h)] px-margin flex items-center justify-between gap-space-sm max-w-md mx-auto">
        <div className="flex items-center gap-space-xs min-w-0 flex-1">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('nav.back')}
              className="w-11 h-11 -ml-2 shrink-0 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon name="arrow_back" size="lg" />
            </button>
          )}

          {title ? (
            <h1 className="min-w-0 font-headline-sm text-headline-sm leading-tight font-bold text-on-surface line-clamp-2 break-words">
              {title}
            </h1>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label={t('nav.home')}
              className="min-h-11 flex items-center gap-space-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img src={logoImg} alt="" className="h-9 w-9 object-contain" />
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                SmartSwap
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center shrink-0">
          {showThemeToggle && <ThemeToggle />}

          {showNotifications && (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={
                unreadNotificationsCount > 0
                  ? t('nav.unreadCount', { count: unreadNotificationsCount })
                  : t('nav.notifications')
              }
              className="relative w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon name="notifications" size="lg" />
              {unreadNotificationsCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 w-3 h-3 rounded-full bg-secondary-container ring-2 ring-surface"
                />
              )}
            </button>
          )}

          {showProfile && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label={t('nav.myProfile')}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar src={currentUser?.avatarUrl} alt={currentUser?.name || ''} size="sm" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
