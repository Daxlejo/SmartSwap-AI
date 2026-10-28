import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Notification } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationMapper,
  formatRelativeTimeSpanish,
} from './mappers/notification.mapper';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;

  const mockPrisma = {
    notification: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const notificationId = 'notif-001';

  const fixedNow = new Date('2026-10-28T18:00:00.000Z');

  const sampleNotification: Notification = {
    id: notificationId,
    userId,
    type: 'SWAP_PROPOSAL_RECEIVED',
    badge: 'Propuesta',
    title: 'Nueva propuesta recibida',
    body: 'Carlos te ha enviado una propuesta de intercambio para tu bicicleta.',
    read: false,
    routeId: 'route-123',
    createdAt: new Date('2026-10-28T17:55:00.000Z'), // 5 minutes before fixedNow
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(
      NotificationsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listUserNotifications', () => {
    it('should return notifications list and unreadCount when user has existing notifications', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(3) // totalCount
        .mockResolvedValueOnce(2); // unreadCount

      mockPrisma.notification.findMany.mockResolvedValueOnce([
        sampleNotification,
        {
          ...sampleNotification,
          id: 'notif-002',
          read: true,
          createdAt: new Date('2026-10-28T17:00:00.000Z'),
        },
      ]);

      const result = await notificationsService.listUserNotifications(userId, {
        limit: 10,
      });

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      expect(result.unreadCount).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(notificationId);
      expect(result.items[0].badge).toBe('Propuesta');
      expect(result.items[0].timeAgo).toBeDefined();
    });

    it('should filter by unreadOnly when requested in query', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(5) // totalCount
        .mockResolvedValueOnce(1); // unreadCount

      mockPrisma.notification.findMany.mockResolvedValueOnce([sampleNotification]);

      const result = await notificationsService.listUserNotifications(userId, {
        unreadOnly: true,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result.unreadCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].read).toBe(false);
    });

    it('should auto-seed welcome notification when user has 0 total notifications', async () => {
      const welcomeNotification: Notification = {
        id: 'welcome-001',
        userId,
        type: 'SYSTEM_WELCOME',
        badge: 'Red Circular Activa',
        title: '¡Bienvenido a SmartSwap!',
        body: 'Publica tu primer objeto o explora el catálogo para descubrir rutas de trueque multi-salto con IA.',
        read: false,
        routeId: null,
        createdAt: fixedNow,
      };

      mockPrisma.notification.count
        .mockResolvedValueOnce(0) // totalCount = 0 (triggers welcome seed)
        .mockResolvedValueOnce(1); // unreadCount

      mockPrisma.notification.create.mockResolvedValueOnce(welcomeNotification);
      mockPrisma.notification.findMany.mockResolvedValueOnce([welcomeNotification]);

      const result = await notificationsService.listUserNotifications(userId);

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'SYSTEM_WELCOME',
          badge: 'Red Circular Activa',
          title: '¡Bienvenido a SmartSwap!',
          body: 'Publica tu primer objeto o explora el catálogo para descubrir rutas de trueque multi-salto con IA.',
          read: false,
        },
      });
      expect(result.unreadCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('SYSTEM_WELCOME');
      expect(result.items[0].badge).toBe('Red Circular Activa');
      expect(result.items[0].title).toBe('¡Bienvenido a SmartSwap!');
      expect(result.items[0].body).toContain('Publica tu primer objeto');
      expect(result.items[0].read).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for the user', async () => {
      mockPrisma.notification.count.mockResolvedValueOnce(4);

      const result = await notificationsService.getUnreadCount(userId);

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId, read: false },
      });
      expect(result).toEqual({ unreadCount: 4 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return updated DTO + unreadCount when owned by user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce(
        sampleNotification,
      );

      const updatedNotification: Notification = {
        ...sampleNotification,
        read: true,
      };
      mockPrisma.notification.update.mockResolvedValueOnce(updatedNotification);
      mockPrisma.notification.count.mockResolvedValueOnce(1); // remaining unread

      const result = await notificationsService.markAsRead(
        userId,
        notificationId,
      );

      expect(mockPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { read: true },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId, read: false },
      });
      expect(result.id).toBe(notificationId);
      expect(result.read).toBe(true);
      expect(result.unreadCount).toBe(1);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce(null);

      await expect(
        notificationsService.markAsRead(userId, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when notification is owned by a different user', async () => {
      const foreignNotification: Notification = {
        ...sampleNotification,
        userId: otherUserId,
      };
      mockPrisma.notification.findUnique.mockResolvedValueOnce(
        foreignNotification,
      );

      await expect(
        notificationsService.markAsRead(userId, notificationId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return updatedCount and unreadCount 0', async () => {
      mockPrisma.notification.updateMany.mockResolvedValueOnce({
        count: 7,
      });

      const result = await notificationsService.markAllAsRead(userId);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, read: false },
        data: { read: true },
      });
      expect(result).toEqual({
        updatedCount: 7,
        unreadCount: 0,
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification when owned by user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce(
        sampleNotification,
      );
      mockPrisma.notification.delete.mockResolvedValueOnce(sampleNotification);

      const result = await notificationsService.deleteNotification(
        userId,
        notificationId,
      );

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
      expect(result).toEqual({
        success: true,
        id: notificationId,
      });
    });

    it('should throw NotFoundException when deleting notification that does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce(null);

      await expect(
        notificationsService.deleteNotification(userId, 'missing-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when deleting notification owned by another user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValueOnce({
        ...sampleNotification,
        userId: otherUserId,
      });

      await expect(
        notificationsService.deleteNotification(userId, notificationId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
    });
  });

  describe('NotificationMapper & Relative Time', () => {
    it('should correctly format Spanish relative times', () => {
      const now = new Date('2026-10-28T12:00:00.000Z');

      // 30 seconds ago
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      expect(formatRelativeTimeSpanish(thirtySecondsAgo, now)).toBe(
        'Hace un momento',
      );

      // 5 minutes ago
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTimeSpanish(fiveMinutesAgo, now)).toBe('Hace 5 min');

      // 2 hours ago
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(twoHoursAgo, now)).toBe('Hace 2 h');

      // 1 day ago
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(oneDayAgo, now)).toBe('Hace 1 día');

      // 3 days ago
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(threeDaysAgo, now)).toBe('Hace 3 días');
    });

    it('should map notification entity to DTO structure with timeAgo', () => {
      const now = new Date('2026-10-28T18:00:00.000Z');
      const dto = NotificationMapper.toDto(sampleNotification, now);

      expect(dto).toEqual({
        id: sampleNotification.id,
        userId: sampleNotification.userId,
        type: sampleNotification.type,
        badge: sampleNotification.badge,
        title: sampleNotification.title,
        body: sampleNotification.body,
        read: sampleNotification.read,
        routeId: sampleNotification.routeId,
        createdAt: sampleNotification.createdAt,
        timeAgo: 'Hace 5 min',
      });
    });
  });
});
