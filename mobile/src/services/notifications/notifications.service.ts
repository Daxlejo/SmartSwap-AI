import { apiClient } from '@/services/http/apiClient';
import type { BadgeProps } from '@/components/ui/Badge';

export type NotificationType =
  | 'proposal_accepted'
  | 'new_route'
  | 'proposal_received'
  | 'proposal_declined'
  | 'swap_completed'
  | 'proposal_expired'
  | 'system'
  | string;

/**
 * Maps the notification types persisted by the API (`routes.service.ts`,
 * `notifications.service.ts`) to the UI notification types.
 */
const API_TYPE_TO_UI_TYPE: Record<string, NotificationType> = {
  ROUTE_PROPOSAL: 'proposal_received',
  ROUTE_CONFIRMED: 'proposal_accepted',
  ROUTE_CANCELLED: 'proposal_declined',
  ROUTE_COMPLETED: 'swap_completed',
  ROUTE_EXPIRED: 'proposal_expired',
  SYSTEM_WELCOME: 'system',
};

export const normalizeNotificationType = (rawType?: string): NotificationType => {
  if (!rawType) return 'system';
  return API_TYPE_TO_UI_TYPE[rawType] ?? rawType;
};

export const isSystemNotification = (type: NotificationType): boolean => type === 'system';

export type NotificationBadge = 'Canje' | 'Ruta inteligente' | 'Sistema' | string;

export interface AppNotification {
  id: string;
  type: NotificationType;
  unread: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  badge: NotificationBadge;
  badgeVariant: BadgeProps['variant'];
  routeId?: string;
  proposalId?: string;
  createdAt?: string;
}

export interface RawNotificationDto {
  id: string;
  userId?: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  content?: string;
  isRead?: boolean;
  unread?: boolean;
  read?: boolean;
  readAt?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  routeId?: string | null;
  proposalId?: string | null;
  itemId?: string | null;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  time?: string;
  badge?: string;
  badgeVariant?: BadgeProps['variant'] | string;
}

export const formatRelativeTimeSpanish = (dateInput?: string | Date): string => {
  if (!dateInput) return 'reciente';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'reciente';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};

export const mapApiNotificationToUi = (dto: RawNotificationDto): AppNotification => {
  const type = normalizeNotificationType(dto.type);

  // Determine unread status from unread, isRead, read, or readAt
  let unread = true;
  if (typeof dto.unread === 'boolean') {
    unread = dto.unread;
  } else if (typeof dto.isRead === 'boolean') {
    unread = !dto.isRead;
  } else if (typeof dto.read === 'boolean') {
    unread = !dto.read;
  } else if (dto.readAt !== undefined) {
    unread = dto.readAt === null;
  }

  const routeId =
    (typeof dto.routeId === 'string' && dto.routeId) ||
    (typeof dto.data?.routeId === 'string' && (dto.data.routeId as string)) ||
    (typeof dto.metadata?.routeId === 'string' && (dto.metadata.routeId as string)) ||
    undefined;

  const proposalId =
    (typeof dto.proposalId === 'string' && dto.proposalId) ||
    (typeof dto.data?.proposalId === 'string' && (dto.data.proposalId as string)) ||
    (typeof dto.metadata?.proposalId === 'string' && (dto.metadata.proposalId as string)) ||
    undefined;

  let defaultIcon = 'notifications';
  let defaultIconColor = 'text-primary';
  let defaultIconBg = 'bg-primary-fixed/60';
  let defaultBadge: NotificationBadge = 'Canje';
  let defaultBadgeVariant: BadgeProps['variant'] = 'secondary-subtle';

  switch (type) {
    case 'proposal_accepted':
      defaultIcon = 'check_circle';
      defaultIconColor = 'text-[#1a7a4a]';
      defaultIconBg = 'bg-[#e8f5ee]';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'secondary-subtle';
      break;
    case 'new_route':
      defaultIcon = 'route';
      defaultIconColor = 'text-primary';
      defaultIconBg = 'bg-primary-fixed/60';
      defaultBadge = 'Ruta inteligente';
      defaultBadgeVariant = 'tertiary-subtle';
      break;
    case 'proposal_received':
      defaultIcon = 'swap_horiz';
      defaultIconColor = 'text-secondary';
      defaultIconBg = 'bg-secondary-fixed/60';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'secondary-subtle';
      break;
    case 'proposal_declined':
      defaultIcon = 'cancel';
      defaultIconColor = 'text-error';
      defaultIconBg = 'bg-error-container/60';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'secondary-subtle';
      break;
    case 'proposal_expired':
      defaultIcon = 'schedule';
      defaultIconColor = 'text-on-surface-variant';
      defaultIconBg = 'bg-surface-container-high';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'surface';
      break;
    case 'swap_completed':
      defaultIcon = 'eco';
      defaultIconColor = 'text-[#1a7a4a]';
      defaultIconBg = 'bg-[#e8f5ee]';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'secondary-subtle';
      break;
    case 'system':
      defaultIcon =
        (dto.title && dto.title.toLowerCase().includes('co₂')) ||
        (dto.body && dto.body.toLowerCase().includes('co₂'))
          ? 'eco'
          : 'verified_user';
      defaultIconColor =
        defaultIcon === 'eco' ? 'text-[#1a7a4a]' : 'text-primary';
      defaultIconBg =
        defaultIcon === 'eco' ? 'bg-[#e8f5ee]' : 'bg-primary-fixed/60';
      defaultBadge = 'Sistema';
      defaultBadgeVariant = 'surface';
      break;
    default:
      defaultIcon = 'notifications';
      defaultIconColor = 'text-primary';
      defaultIconBg = 'bg-surface-container-high';
      defaultBadge = 'Canje';
      defaultBadgeVariant = 'secondary-subtle';
      break;
  }

  const createdAtIso =
    dto.createdAt instanceof Date
      ? dto.createdAt.toISOString()
      : typeof dto.createdAt === 'string'
        ? dto.createdAt
        : undefined;

  return {
    id: String(dto.id),
    type,
    unread,
    icon: dto.icon || defaultIcon,
    iconColor: dto.iconColor || defaultIconColor,
    iconBg: dto.iconBg || defaultIconBg,
    title: dto.title || 'Notificación',
    body: dto.body || dto.message || dto.content || '',
    time: dto.time || formatRelativeTimeSpanish(createdAtIso),
    badge: (dto.badge as NotificationBadge) || defaultBadge,
    badgeVariant: (dto.badgeVariant as BadgeProps['variant']) || defaultBadgeVariant,
    routeId,
    proposalId,
    createdAt: createdAtIso,
  };
};

export const notificationsService = {
  /**
   * List user notifications with optional filter for unread only.
   */
  async listNotifications(unreadOnly?: boolean): Promise<AppNotification[]> {
    const params: Record<string, string | boolean> = {};
    if (unreadOnly) {
      params.unreadOnly = true;
    }

    const response = await apiClient.get<
      | RawNotificationDto[]
      | { notifications?: RawNotificationDto[]; items?: RawNotificationDto[]; data?: RawNotificationDto[] }
    >('/notifications', { params });

    let rawList: RawNotificationDto[] = [];
    if (Array.isArray(response)) {
      rawList = response;
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response.notifications)) {
        rawList = response.notifications;
      } else if (Array.isArray(response.items)) {
        rawList = response.items;
      } else if (Array.isArray(response.data)) {
        rawList = response.data;
      }
    }

    const mapped = rawList.map(mapApiNotificationToUi);
    if (unreadOnly) {
      return mapped.filter((n) => n.unread);
    }
    return mapped;
  },

  /**
   * Retrieve the current unread notifications count for the authenticated user.
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get<
        { count?: number; unreadCount?: number } | number
      >('/notifications/unread-count');
      if (typeof res === 'number') return res;
      if (typeof res?.unreadCount === 'number') return res.unreadCount;
      if (typeof res?.count === 'number') return res.count;
    } catch {
      // Fallback: fetch unread notifications list
    }

    const unread = await this.listNotifications(true);
    return unread.length;
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<AppNotification> {
    const response = await apiClient.patch<RawNotificationDto>(`/notifications/${id}/read`);
    if (response && response.id) {
      return mapApiNotificationToUi({ ...response, unread: false, isRead: true });
    }
    return mapApiNotificationToUi({ id, unread: false, isRead: true });
  },

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const response = await apiClient.patch<{ updatedCount?: number } | number>(
      '/notifications/read-all',
    );
    if (typeof response === 'number') {
      return { updatedCount: response };
    }
    if (response && typeof response.updatedCount === 'number') {
      return { updatedCount: response.updatedCount };
    }
    return { updatedCount: 0 };
  },

  /**
   * Delete a single notification.
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },
};
