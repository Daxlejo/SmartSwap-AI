import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/http/apiClient';
import {
  notificationsService,
  mapApiNotificationToUi,
  formatRelativeTimeSpanish,
  isSystemNotification,
  normalizeNotificationType,
  type RawNotificationDto,
} from '@/services/notifications/notifications.service';

describe('notificationsService & mapApiNotificationToUi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('mapApiNotificationToUi', () => {
    it('normalizes the notification types persisted by the API', () => {
      expect(normalizeNotificationType('ROUTE_PROPOSAL')).toBe('proposal_received');
      expect(normalizeNotificationType('ROUTE_CONFIRMED')).toBe('proposal_accepted');
      expect(normalizeNotificationType('ROUTE_CANCELLED')).toBe('proposal_declined');
      expect(normalizeNotificationType('ROUTE_COMPLETED')).toBe('swap_completed');
      expect(normalizeNotificationType('SYSTEM_WELCOME')).toBe('system');
      expect(normalizeNotificationType(undefined)).toBe('system');
      expect(isSystemNotification(normalizeNotificationType('SYSTEM_WELCOME'))).toBe(true);
      expect(isSystemNotification(normalizeNotificationType('ROUTE_PROPOSAL'))).toBe(false);
    });

    it('maps a real API ROUTE_PROPOSAL payload to a swap notification with routeId', () => {
      const dto: RawNotificationDto = {
        id: 'n-api-1',
        userId: 'user-valeria',
        type: 'ROUTE_PROPOSAL',
        badge: 'Nueva ruta circular',
        title: 'Propuesta de trueque SW-1234',
        body: 'Alex te propone una ruta circular.',
        read: false,
        routeId: 'route-uuid-1',
        createdAt: new Date().toISOString(),
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.type).toBe('proposal_received');
      expect(mapped.icon).toBe('swap_horiz');
      expect(mapped.unread).toBe(true);
      expect(mapped.badge).toBe('Nueva ruta circular');
      expect(mapped.routeId).toBe('route-uuid-1');
    });

    it('maps standard proposal_accepted notification correctly', () => {
      const dto: RawNotificationDto = {
        id: 'notif-1',
        type: 'proposal_accepted',
        unread: true,
        title: 'Carlos aceptó tu propuesta',
        body: 'Bicicleta Trek ↔ Balón FIFA — El intercambio puede continuar.',
        time: 'hace 5 min',
        badge: 'Canje',
        badgeVariant: 'secondary-subtle',
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.id).toBe('notif-1');
      expect(mapped.type).toBe('proposal_accepted');
      expect(mapped.unread).toBe(true);
      expect(mapped.title).toBe('Carlos aceptó tu propuesta');
      expect(mapped.body).toContain('Bicicleta Trek');
      expect(mapped.icon).toBe('check_circle');
      expect(mapped.iconColor).toBe('text-[#1a7a4a]');
      expect(mapped.iconBg).toBe('bg-[#e8f5ee]');
      expect(mapped.badge).toBe('Canje');
      expect(mapped.badgeVariant).toBe('secondary-subtle');
    });

    it('derives new_route defaults and extracts routeId from metadata', () => {
      const dto: RawNotificationDto = {
        id: 'notif-route-2',
        type: 'new_route',
        isRead: false,
        title: 'Nueva ruta encontrada para ti',
        message: 'Circuito de 4 pasos disponible',
        metadata: { routeId: 'SR-9988' },
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.type).toBe('new_route');
      expect(mapped.unread).toBe(true);
      expect(mapped.icon).toBe('route');
      expect(mapped.iconColor).toBe('text-primary');
      expect(mapped.badge).toBe('Ruta inteligente');
      expect(mapped.badgeVariant).toBe('tertiary-subtle');
      expect(mapped.routeId).toBe('SR-9988');
    });

    it('extracts routeId and proposalId from data object', () => {
      const dto: RawNotificationDto = {
        id: 'notif-data-3',
        type: 'proposal_received',
        read: false,
        title: 'Mateo quiere tu bicicleta',
        data: { routeId: 'route-456', proposalId: 'prop-789' },
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.routeId).toBe('route-456');
      expect(mapped.proposalId).toBe('prop-789');
      expect(mapped.unread).toBe(true);
      expect(mapped.icon).toBe('swap_horiz');
      expect(mapped.iconColor).toBe('text-secondary');
    });

    it('handles readAt timestamp logic for unread status', () => {
      const unreadDto: RawNotificationDto = {
        id: 'notif-unread',
        title: 'Mensaje nuevo',
        readAt: null,
      };
      expect(mapApiNotificationToUi(unreadDto).unread).toBe(true);

      const readDto: RawNotificationDto = {
        id: 'notif-read',
        title: 'Mensaje leído',
        readAt: '2026-10-28T12:00:00Z',
      };
      expect(mapApiNotificationToUi(readDto).unread).toBe(false);
    });

    it('maps system notifications with eco icon when CO2 is mentioned', () => {
      const dto: RawNotificationDto = {
        id: 'notif-eco',
        type: 'system',
        unread: false,
        title: '14.2 kg CO₂ ahorrados',
        body: 'Has participado en múltiples canjes sustentables.',
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.type).toBe('system');
      expect(mapped.icon).toBe('eco');
      expect(mapped.iconColor).toBe('text-[#1a7a4a]');
      expect(mapped.badge).toBe('Sistema');
      expect(mapped.badgeVariant).toBe('surface');
    });

    it('maps proposal_declined with cancel icon and error color', () => {
      const dto: RawNotificationDto = {
        id: 'notif-declined',
        type: 'proposal_declined',
        unread: false,
        title: 'Propuesta rechazada',
        body: 'Sofía rechazó el intercambio.',
      };

      const mapped = mapApiNotificationToUi(dto);

      expect(mapped.icon).toBe('cancel');
      expect(mapped.iconColor).toBe('text-error');
      expect(mapped.iconBg).toBe('bg-error-container/60');
      expect(mapped.badge).toBe('Canje');
    });
  });

  describe('formatRelativeTimeSpanish', () => {
    it('formats recent timestamps accurately in Spanish', () => {
      const now = new Date();
      expect(formatRelativeTimeSpanish(now.toISOString())).toBe('hace un momento');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTimeSpanish(fiveMinutesAgo.toISOString())).toBe('hace 5 min');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(twoHoursAgo.toISOString())).toBe('hace 2 h');

      const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(yesterday.toISOString())).toBe('ayer');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTimeSpanish(threeDaysAgo.toISOString())).toBe('hace 3 días');
    });

    it('returns default fallback for missing or invalid dates', () => {
      expect(formatRelativeTimeSpanish(undefined)).toBe('reciente');
      expect(formatRelativeTimeSpanish('invalid-date-string')).toBe('reciente');
    });
  });

  describe('notificationsService methods', () => {
    it('listNotifications retrieves and maps notification array from GET /notifications', async () => {
      const mockRawNotifications: RawNotificationDto[] = [
        {
          id: 'n-1',
          type: 'proposal_accepted',
          unread: true,
          title: 'Aceptado',
          body: 'Detalles del canje',
        },
        {
          id: 'n-2',
          type: 'system',
          unread: false,
          title: 'Sistema',
          body: 'Aviso importante',
        },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockRawNotifications);

      const result = await notificationsService.listNotifications();

      expect(getSpy).toHaveBeenCalledWith('/notifications', { params: {} });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('n-1');
      expect(result[0].unread).toBe(true);
      expect(result[1].id).toBe('n-2');
      expect(result[1].unread).toBe(false);
    });

    it('listNotifications handles wrapped response envelope and unreadOnly filter', async () => {
      const wrappedResponse = {
        notifications: [
          { id: 'n-1', unread: true, title: 'No leída' },
          { id: 'n-2', unread: false, title: 'Ya leída' },
        ],
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(wrappedResponse);

      const unreadOnlyResult = await notificationsService.listNotifications(true);

      expect(getSpy).toHaveBeenCalledWith('/notifications', { params: { unreadOnly: true } });
      expect(unreadOnlyResult).toHaveLength(1);
      expect(unreadOnlyResult[0].id).toBe('n-1');
      expect(unreadOnlyResult[0].unread).toBe(true);
    });

    it('getUnreadCount retrieves count from /notifications/unread-count when available', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({ unreadCount: 4 });

      const count = await notificationsService.getUnreadCount();

      expect(count).toBe(4);
    });

    it('getUnreadCount falls back to listNotifications(true) when unread-count endpoint fails', async () => {
      vi.spyOn(apiClient, 'get')
        .mockRejectedValueOnce(new Error('Endpoint not found'))
        .mockResolvedValueOnce([
          { id: 'n-1', unread: true, title: 'A' },
          { id: 'n-2', unread: true, title: 'B' },
        ]);

      const count = await notificationsService.getUnreadCount();

      expect(count).toBe(2);
    });

    it('markAsRead calls PATCH /notifications/:id/read and returns mapped notification', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
        id: 'n-123',
        type: 'new_route',
        title: 'Ruta 123',
        unread: false,
      });

      const updated = await notificationsService.markAsRead('n-123');

      expect(patchSpy).toHaveBeenCalledWith('/notifications/n-123/read');
      expect(updated.id).toBe('n-123');
      expect(updated.unread).toBe(false);
    });

    it('markAllAsRead calls PATCH /notifications/read-all and returns updated count', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ updatedCount: 5 });

      const result = await notificationsService.markAllAsRead();

      expect(patchSpy).toHaveBeenCalledWith('/notifications/read-all');
      expect(result.updatedCount).toBe(5);
    });

    it('deleteNotification calls DELETE /notifications/:id', async () => {
      const delSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

      await notificationsService.deleteNotification('notif-to-delete');

      expect(delSpy).toHaveBeenCalledWith('/notifications/notif-to-delete');
    });
  });
});
