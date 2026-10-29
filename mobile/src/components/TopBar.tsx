import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { useApp } from '@/context/AppContext';
import { Icon } from './ui/Icon';
import { Avatar } from './ui/Avatar';
import { ThemeToggle } from './ui/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  showProfile?: boolean;
}

export const TopBar = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showNotifications = true,
  showProfile = true,
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
    <header className="sticky top-0 w-full z-40 shrink-0 pt-safe bg-surface/95 backdrop-blur-xl border-b border-surface-container-high/40 shadow-[0_1px_12px_rgba(19,27,46,0.04)]">
      <div className="h-16 px-margin flex items-center justify-between gap-space-sm max-w-md mx-auto">
        {/* Left side */}
        <div className="flex items-center gap-space-sm min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('nav.back')}
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 active:bg-surface-container-high/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon name="arrow_back" size="lg" />
            </button>
          ) : null}

          {title ? (
            <div className="flex flex-col min-w-0">
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate max-w-[200px]">
                {title}
              </h1>
              {subtitle && (
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider truncate max-w-[200px]">
                  {subtitle}
                </span>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-space-sm cursor-pointer select-none"
              onClick={() => navigate('/home')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/home');
              }}
            >
              <img
                src={logoImg}
                alt={t('nav.logo')}
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                  SmartSwap
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">
                  {t('nav.home')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-space-xs shrink-0">
          <ThemeToggle />

          {showNotifications && (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={t('nav.notifications')}
              className="relative w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon name="notifications" size="lg" />
              {unreadNotificationsCount > 0 && (
                <span
                  aria-label={t('nav.unreadCount', { count: unreadNotificationsCount })}
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface"
                />
              )}
            </button>
          )}

          {showProfile && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label={t('nav.myProfile')}
              className="w-11 h-11 flex items-center justify-center rounded-full p-0.5 hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar
                src={currentUser?.avatarUrl}
                alt={currentUser?.name || 'Alex Morales'}
                size="sm"
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
