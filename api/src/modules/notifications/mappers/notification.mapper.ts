import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  badge: string;
  title: string;
  body: string;
  read: boolean;
  routeId: string | null;
  createdAt: Date;
  timeAgo: string;
}

export interface NotificationWithUnreadCountDto extends NotificationDto {
  unreadCount: number;
}

export function formatRelativeTimeSpanish(
  date: Date | string | number,
  baseDate: Date = new Date(),
): string {
  const target =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  const now = baseDate.getTime();
  const diffMs = Math.max(0, now - target.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSec < 60) {
    return 'Hace un momento';
  }
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
  }
  if (diffWeeks < 5) {
    return diffWeeks === 1 ? 'Hace 1 semana' : `Hace ${diffWeeks} semanas`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Hace 1 mes' : `Hace ${diffMonths} meses`;
  }
  return diffYears === 1 ? 'Hace 1 año' : `Hace ${diffYears} años`;
}

@Injectable()
export class NotificationMapper {
  static toDto(
    notification: Notification,
    baseDate: Date = new Date(),
  ): NotificationDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      badge: notification.badge,
      title: notification.title,
      body: notification.body,
      read: notification.read,
      routeId: notification.routeId ?? null,
      createdAt: notification.createdAt,
      timeAgo: formatRelativeTimeSpanish(notification.createdAt, baseDate),
    };
  }

  static toDtoList(
    notifications: Notification[],
    baseDate: Date = new Date(),
  ): NotificationDto[] {
    return notifications.map((item) => NotificationMapper.toDto(item, baseDate));
  }
}
