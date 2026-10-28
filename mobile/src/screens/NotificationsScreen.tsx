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

type FilterTab = 'Todas' | 'Canjes' | 'Sistema';

export const NotificationsScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>('Todas');
  const {
    notifications,
    markNotificationReadReal,
    markAllNotificationsReadReal,
  } = useApp();

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
      if (activeTab === 'Canjes') {
        return !isSystemNotification(notif.type);
      }
      if (activeTab === 'Sistema') {
        return isSystemNotification(notif.type);
      }
      return true; // 'Todas'
    });
  }, [notifications, activeTab]);

  return (
    <div className="flex flex-col px-margin py-4 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-col">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            Notificaciones
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Últimas actualizaciones de tus canjes
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllAsRead}
          className="font-label-sm text-label-sm font-bold text-primary hover:underline transition-colors shrink-0 pt-1"
        >
          Marcar todas como leídas
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['Todas', 'Canjes', 'Sistema'] as const).map((tab) => (
          <Chip
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Chip>
        ))}
      </div>

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          iconName="notifications_off"
          title="Sin notificaciones"
          description="Aquí aparecerán tus actualizaciones de canjes y rutas."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotifications.map((notif) => (
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
                      {notif.title}
                    </h2>
                    {notif.unread && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary shrink-0"
                        aria-label="No leída"
                      />
                    )}
                  </div>
                  <Badge variant={notif.badgeVariant} className="shrink-0 text-[10px]">
                    {notif.badge}
                  </Badge>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2 leading-relaxed">
                  {notif.body}
                </p>

                <span className="font-label-sm text-label-sm text-outline block">
                  {notif.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
