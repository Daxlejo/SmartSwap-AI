import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';

type FilterTab = 'Todas' | 'Canjes' | 'Sistema';

interface NotificationItem {
  id: string;
  type: 'proposal_accepted' | 'new_route' | 'proposal_received' | 'proposal_declined' | 'system';
  unread: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  badge: 'Canje' | 'Ruta inteligente' | 'Sistema';
  badgeVariant: BadgeProps['variant'];
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'proposal_accepted',
    unread: true,
    icon: 'check_circle',
    iconColor: 'text-[#1a7a4a]',
    iconBg: 'bg-[#e8f5ee]',
    title: 'Carlos aceptó tu propuesta',
    body: 'Bicicleta Trek ↔ Balón FIFA — El intercambio puede continuar.',
    time: 'hace 5 min',
    badge: 'Canje',
    badgeVariant: 'secondary-subtle',
  },
  {
    id: 'notif-2',
    type: 'new_route',
    unread: true,
    icon: 'route',
    iconColor: 'text-primary',
    iconBg: 'bg-primary-fixed/60',
    title: 'Nueva ruta encontrada para ti',
    body: 'Encontramos un circuito de 4 pasos: Bicicleta → Balón → Audífonos → Cámara',
    time: 'hace 23 min',
    badge: 'Ruta inteligente',
    badgeVariant: 'tertiary-subtle',
  },
  {
    id: 'notif-3',
    type: 'proposal_received',
    unread: true,
    icon: 'swap_horiz',
    iconColor: 'text-secondary',
    iconBg: 'bg-secondary-fixed/60',
    title: 'Mateo quiere tu bicicleta',
    body: 'Mateo R. ofrece su Nintendo Switch OLED a cambio de tu Trek Marlin 7.',
    time: 'hace 1 h',
    badge: 'Canje',
    badgeVariant: 'secondary-subtle',
  },
  {
    id: 'notif-4',
    type: 'proposal_declined',
    unread: false,
    icon: 'cancel',
    iconColor: 'text-error',
    iconBg: 'bg-error-container/60',
    title: 'Propuesta rechazada',
    body: 'Sofía rechazó el intercambio por la lente Sony 50mm.',
    time: 'hace 3 h',
    badge: 'Canje',
    badgeVariant: 'secondary-subtle',
  },
  {
    id: 'notif-5',
    type: 'system',
    unread: false,
    icon: 'verified_user',
    iconColor: 'text-primary',
    iconBg: 'bg-primary-fixed/60',
    title: 'Identidad verificada',
    body: 'Tu cuenta ha sido verificada con documento oficial.',
    time: 'ayer',
    badge: 'Sistema',
    badgeVariant: 'surface',
  },
  {
    id: 'notif-6',
    type: 'system',
    unread: false,
    icon: 'eco',
    iconColor: 'text-[#1a7a4a]',
    iconBg: 'bg-[#e8f5ee]',
    title: '14.2 kg CO₂ ahorrados',
    body: 'Llevas 23 canjes completos. ¡Sigue extendiendo la vida útil de los artículos!',
    time: 'hace 3 días',
    badge: 'Sistema',
    badgeVariant: 'surface',
  },
];

export const NotificationsScreen = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('Todas');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'Canjes') {
        return notif.badge === 'Canje';
      }
      if (activeTab === 'Sistema') {
        return notif.badge === 'Sistema';
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
              onClick={() => handleToggleRead(notif.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToggleRead(notif.id);
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
