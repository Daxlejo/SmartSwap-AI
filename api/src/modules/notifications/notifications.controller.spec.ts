import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  NotificationDto,
  NotificationWithUnreadCountDto,
} from './mappers/notification.mapper';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const currentUser: CurrentUserPayload = {
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'valeria@smartswap.co',
  };

  const sampleNotificationDto: NotificationDto = {
    id: 'notif-001',
    userId: currentUser.sub,
    type: 'SYSTEM_WELCOME',
    badge: 'Red Circular Activa',
    title: '¡Bienvenido a SmartSwap!',
    body: 'Publica tu primer objeto o explora el catálogo para descubrir rutas de trueque multi-salto con IA.',
    read: false,
    routeId: null,
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    timeAgo: 'Hace 5 min',
  };

  beforeEach(async () => {
    const mockService = {
      listUserNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listUserNotifications', () => {
    it('should delegate to service with userId and query params', async () => {
      const mockResult = {
        items: [sampleNotificationDto],
        unreadCount: 1,
      };
      notificationsService.listUserNotifications.mockResolvedValueOnce(
        mockResult,
      );

      const query = { unreadOnly: true, limit: 20 };
      const result = await controller.listUserNotifications(currentUser, query);

      expect(notificationsService.listUserNotifications).toHaveBeenCalledWith(
        currentUser.sub,
        query,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUnreadCount', () => {
    it('should delegate to service and return unread count', async () => {
      notificationsService.getUnreadCount.mockResolvedValueOnce({
        unreadCount: 3,
      });

      const result = await controller.getUnreadCount(currentUser);

      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
        currentUser.sub,
      );
      expect(result).toEqual({ unreadCount: 3 });
    });
  });

  describe('markAllAsRead (POST and PATCH)', () => {
    it('should delegate to service for markAllAsReadPost', async () => {
      notificationsService.markAllAsRead.mockResolvedValueOnce({
        updatedCount: 5,
        unreadCount: 0,
      });

      const result = await controller.markAllAsReadPost(currentUser);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(
        currentUser.sub,
      );
      expect(result).toEqual({ updatedCount: 5, unreadCount: 0 });
    });

    it('should delegate to service for markAllAsReadPatch', async () => {
      notificationsService.markAllAsRead.mockResolvedValueOnce({
        updatedCount: 2,
        unreadCount: 0,
      });

      const result = await controller.markAllAsReadPatch(currentUser);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(
        currentUser.sub,
      );
      expect(result).toEqual({ updatedCount: 2, unreadCount: 0 });
    });
  });

  describe('markAsRead (PATCH and POST)', () => {
    const updatedDto: NotificationWithUnreadCountDto = {
      ...sampleNotificationDto,
      read: true,
      unreadCount: 0,
    };

    it('should delegate to service for markAsReadPatch', async () => {
      notificationsService.markAsRead.mockResolvedValueOnce(updatedDto);

      const result = await controller.markAsReadPatch(
        currentUser,
        'notif-001',
      );

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        currentUser.sub,
        'notif-001',
      );
      expect(result).toEqual(updatedDto);
    });

    it('should delegate to service for markAsReadPost', async () => {
      notificationsService.markAsRead.mockResolvedValueOnce(updatedDto);

      const result = await controller.markAsReadPost(
        currentUser,
        'notif-001',
      );

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        currentUser.sub,
        'notif-001',
      );
      expect(result).toEqual(updatedDto);
    });
  });

  describe('deleteNotification', () => {
    it('should delegate to service with userId and notificationId', async () => {
      notificationsService.deleteNotification.mockResolvedValueOnce({
        success: true,
        id: 'notif-001',
      });

      const result = await controller.deleteNotification(
        currentUser,
        'notif-001',
      );

      expect(notificationsService.deleteNotification).toHaveBeenCalledWith(
        currentUser.sub,
        'notif-001',
      );
      expect(result).toEqual({ success: true, id: 'notif-001' });
    });
  });
});
