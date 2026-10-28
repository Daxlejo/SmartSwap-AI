import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import {
  isSystemNotification,
  type AppNotification,
} from '@/services/notifications/notifications.service';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/utils/relativeTime';
import { useTranslation } from '@/hooks/useTranslation';

type FilterTab = 'all' | 'swaps' | 'system';

const FILTER_TABS: readonly FilterTab[] = ['all', 'swaps', 'system'];

const ROUTE_CODE_PATTERN = /S[WR]-[0-9]+/i;

/** API notification types with a localized template; Spanish keeps the richer stored text. */
const LOCALIZED_TYPES = new Set([
  'proposal_received',
  'proposal_accepted',
  'proposal_declined',
  'swap_completed',
  'proposal_expired',
  'system',
]);

export const NotificationsScreen = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const {
    notifications,
    markNotificationReadReal,
    markAllNotificationsReadReal,
  } = useApp();

  const localize = (notif: AppNotification) => {
    if (language === 'es' || !notif.createdAt || !LOCALIZED_TYPES.has(notif.type)) {
      return { title: notif.title, body: notif.body, badge: notif.badge };
    }
    const code = notif.title.match(ROUTE_CODE_PATTERN)?.[0] ?? '';
    return {
      title: t(`notifications.types.${notif.type}.title`, { code }),
      body: t(`notifications.types.${notif.type}.body`, { code }),
      badge: t(`notifications.types.${notif.type}.badge`),
    };
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsReadReal();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (notif.unread) {
      await markNotificationReadReal(notif.id);
    }

    if (notif.routeId) {
      navigate(`/swap/route/${notif.routeId}`);
    } else {
      navigate('/trades');
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'swaps') {
        return !isSystemNotification(notif.type);
      }
      if (activeTab === 'system') {
        return isSystemNotification(notif.type);
      }
      return true; // 'all'
    });
  }, [notifications, activeTab]);

  return (
    <div className="flex flex-col px-margin py-4 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-col">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            {t('notifications.title')}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('notifications.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllAsRead}
          className="font-label-sm text-label-sm font-bold text-primary hover:underline transition-colors shrink-0 pt-1"
        >
          {t('notifications.markAllAsRead')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <Chip
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {t(`notifications.tabs.${tab}`)}
          </Chip>
        ))}
      </div>

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          iconName="notifications_off"
          title={t('notifications.emptyTitle')}
          description={t('notifications.emptyDescription')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotifications.map((notif) => {
            const text = localize(notif);
            return (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(notif)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNotificationClick(notif);
                }
              }}
              className={clsx(
                'rounded-2xl border p-space-md flex items-start gap-space-sm text-left transition-all cursor-pointer',
                notif.unread
                  ? 'bg-surface-container-low border-surface-container-high/60 border-l-2 !border-l-primary'
                  : 'bg-surface-container-lowest border-surface-container-high/60',
              )}
            >
              {/* 40x40 circle icon */}
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  notif.iconBg,
                )}
              >
                <Icon name={notif.icon} size="md" filled className={notif.iconColor} />
              </div>

              {/* Notification text & metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                      {text.title}
                    </h2>
                    {notif.unread && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary shrink-0"
                        aria-label={t('notifications.unread')}
                      />
                    )}
                  </div>
                  <Badge variant={notif.badgeVariant} className="shrink-0 text-[10px]">
                    {text.badge}
                  </Badge>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2 leading-relaxed">
                  {text.body}
                </p>

                <span className="font-label-sm text-label-sm text-outline block">
                  {notif.createdAt ? formatRelativeTime(notif.createdAt, language) : notif.time}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
