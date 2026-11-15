import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from './ui/Icon';

/** Shown next to the greeting on Home only; the badge counts unread notifications. */
export const NotificationBell = () => {
  const navigate = useNavigate();
  const { unreadNotificationsCount: unread } = useApp();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      aria-label={unread > 0 ? t('nav.notificationsUnread', { count: unread }) : t('nav.notifications')}
      className="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-surface-container-low border border-surface-container-high text-on-surface hover:bg-surface-container active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon name="notifications" size="lg" filled={unread > 0} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-caption leading-none font-bold flex items-center justify-center ring-2 ring-surface"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};
