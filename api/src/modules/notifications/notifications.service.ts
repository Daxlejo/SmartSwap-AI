import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  NotificationDto,
  NotificationMapper,
  NotificationWithUnreadCountDto,
} from './mappers/notification.mapper';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  badge: string;
  title: string;
  body: string;
  routeId?: string | null;
  read?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserNotifications(
    userId: string,
    query?: QueryNotificationsDto,
  ): Promise<{ items: NotificationDto[]; unreadCount: number }> {
    const totalCount = await this.prisma.notification.count({
      where: { userId },
    });

    if (totalCount === 0) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM_WELCOME',
          badge: 'Red Circular Activa',
          title: '¡Bienvenido a SmartSwap!',
          body: 'Publica tu primer objeto o explora el catálogo para descubrir rutas de trueque multi-salto con IA.',
          read: false,
        },
      });
    }

    const limit = query?.limit ?? 50;
    const unreadOnly = query?.unreadOnly ?? false;

    const whereClause: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      items: notifications.map((n) => NotificationMapper.toDto(n)),
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { unreadCount };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationWithUnreadCountDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found`,
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      ...NotificationMapper.toDto(updated),
      unreadCount,
    };
  }

  async markAllAsRead(
    userId: string,
  ): Promise<{ updatedCount: number; unreadCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return {
      updatedCount: result.count,
      unreadCount: 0,
    };
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<{ success: boolean; id: string }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found`,
      );
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      success: true,
      id: notificationId,
    };
  }

  async createNotification(
    data: CreateNotificationInput,
  ): Promise<NotificationDto> {
    const created = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        badge: data.badge,
        title: data.title,
        body: data.body,
        routeId: data.routeId ?? null,
        read: data.read ?? false,
      },
    });
    return NotificationMapper.toDto(created);
  }
}
