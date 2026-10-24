import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/http/apiClient';
import {
  routesService,
  mapApiRouteToUiRoute,
  mapRouteToProposal,
  formatMatchScore,
  type SwapRouteDto,
} from '@/services/routes/routes.service';

describe('routesService & mapApiRouteToUiRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleApiRoute: SwapRouteDto = {
    id: 'route-cycle-301',
    code: 'SR-9104',
    initiatorId: 'user-alex',
    objectiveText: 'Cámara Fujifilm X-T30 II',
    matchScore: 96,
    status: 'ACTIVE',
    aiExplanation:
      'Ciclo de 3 usuarios con valores equilibrados ($780 → $390 → $790) y 0 USD de diferencia neta para el iniciador.',
    co2SavedKg: 34.6,
    steps: [
      {
        id: 'step-1',
        stepOrder: 1,
        userId: 'user-alex',
        user: {
          id: 'user-alex',
          name: 'Alex Morales',
          email: 'alex.morales@smartswap.io',
          rating: 4.9,
          location: 'Madrid Centro',
          verified: true,
        },
        givesItemId: 'item-bike',
        givesItem: {
          id: 'item-bike',
          name: 'Bicicleta Trek Marlin 7',
          category: 'Deportes',
          condition: 'LIKE_NEW',
          ownerId: 'user-alex',
          estimatedValue: 780,
        },
        receivesItemId: 'item-camera',
        acceptance: 'ACCEPTED',
        deliveryConfirmed: false,
      },
      {
        id: 'step-2',
        stepOrder: 2,
        userId: 'user-carlos',
        user: {
          id: 'user-carlos',
          name: 'Carlos R.',
          email: 'carlos.r@correo.es',
          rating: 4.8,
          location: 'Madrid, Retiro',
          verified: true,
        },
        givesItemId: 'item-switch',
        givesItem: {
          id: 'item-switch',
          name: 'Nintendo Switch OLED',
          category: 'Videojuegos',
          condition: 'GOOD',
          ownerId: 'user-carlos',
          estimatedValue: 310,
        },
        receivesItemId: 'item-bike',
        acceptance: 'PENDING',
        deliveryConfirmed: false,
      },
      {
        id: 'step-3',
        stepOrder: 3,
        userId: 'user-sofia',
        user: {
          id: 'user-sofia',
          name: 'Sofía V.',
          email: 'sofia.v@correo.es',
          rating: 5.0,
          location: 'Madrid, Malasaña',
          verified: true,
        },
        givesItemId: 'item-camera',
        givesItem: {
          id: 'item-camera',
          name: 'Cámara Fujifilm X-T30 II',
          category: 'Fotografía',
          condition: 'NEW',
          ownerId: 'user-sofia',
          estimatedValue: 790,
        },
        receivesItemId: 'item-switch',
        acceptance: 'ACCEPTED',
        deliveryConfirmed: true,
      },
    ],
  };

  describe('mapApiRouteToUiRoute', () => {
    it('normalizes backend SwapRouteDto into the UI SwapRoute contract', () => {
      const uiRoute = mapApiRouteToUiRoute(sampleApiRoute);

      expect(uiRoute.id).toBe('route-cycle-301');
      expect(uiRoute.code).toBe('SR-9104');
      expect(uiRoute.stepsCount).toBe(3);
      expect(uiRoute.offeredItemId).toBe('item-bike');
      expect(uiRoute.targetItemId).toBe('item-camera');
      expect(uiRoute.co2SavedKg).toBe(34.6);
      expect(uiRoute.matchScore).toBe(96);
      expect(uiRoute.status).toBe('ACTIVE');
      expect(uiRoute.isLoop).toBe(true);
      expect(uiRoute.aiExplanation).toContain('Ciclo de 3 usuarios con valores equilibrados');

      expect(uiRoute.participants).toHaveLength(3);
      expect(uiRoute.participants.map((p) => p.id)).toEqual([
        'user-alex',
        'user-carlos',
        'user-sofia',
      ]);

      expect(uiRoute.chainItems).toHaveLength(3);
      expect(uiRoute.chainItems.map((i) => i.id)).toEqual([
        'item-bike',
        'item-switch',
        'item-camera',
      ]);
      expect(uiRoute.chainItems[0].condition).toBe('Excelente estado');
      expect(uiRoute.chainItems[2].condition).toBe('Como nuevo');

      expect(uiRoute.steps).toHaveLength(3);
      expect(uiRoute.steps?.[0].acceptance).toBe('ACCEPTED');
      expect(uiRoute.steps?.[1].acceptance).toBe('PENDING');
      expect(uiRoute.steps?.[2].deliveryConfirmed).toBe(true);
    });

    it('maps route to Proposal contract and formats fractional or integer match scores', () => {
      expect(formatMatchScore(0.94)).toBe(94);
      expect(formatMatchScore(98)).toBe(98);

      const proposal = mapRouteToProposal(sampleApiRoute, 'user-alex');
      expect(proposal.id).toBe('route-cycle-301');
      expect(proposal.offeredItemId).toBe('item-bike');
      expect(proposal.targetItemId).toBe('item-camera');
      expect(proposal.proposerUserId).toBe('user-alex');
      expect(proposal.recipientUserId).toBe('user-carlos');
      expect(proposal.status).toBe('pending');
    });
  });

  describe('searchRoutes', () => {
    it('calls POST /routes/search and maps discovered routes', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce([sampleApiRoute]);

      const payload = {
        offeredItemId: 'item-bike',
        objectiveText: 'Cámara Fujifilm X-T30 II',
        desiredCategory: 'Fotografía',
        maxSteps: 4,
        valueTolerancePct: 25,
      };

      const routes = await routesService.searchRoutes(payload);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/routes/search', payload);
      expect(routes).toHaveLength(1);
      expect(routes[0].id).toBe('route-cycle-301');
      expect(routes[0].aiExplanation).toBe(sampleApiRoute.aiExplanation);
    });

    it('gracefully falls back to local routeFinder when offline or backend unreachable', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('NetworkError'));

      const routes = await routesService.searchRoutes({
        offeredItemId: 'item-bike',
        objectiveText: 'Cámara Fujifilm X-T30 II',
        maxSteps: 4,
      });

      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].offeredItemId).toBe('item-bike');
      expect(routes[0].targetItemId).toBe('item-camera');
      expect(routes[0].aiExplanation).toBeDefined();
    });
  });

  describe('proposeRoute', () => {
    it('calls POST /routes/propose and returns the mapped SwapRoute', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        ...sampleApiRoute,
        status: 'ACTIVE',
      });

      const payload = {
        routeId: 'route-cycle-301',
        offeredItemId: 'item-bike',
        targetItemId: 'item-camera',
        objectiveText: 'Cámara Fujifilm X-T30 II',
        matchScore: 96,
        co2SavedKg: 34.6,
        steps: [
          {
            stepOrder: 1,
            userId: 'user-alex',
            givesItemId: 'item-bike',
            receivesItemId: 'item-camera',
          },
        ],
      };

      const result = await routesService.proposeRoute(payload);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/routes/propose', payload);
      expect(result.id).toBe('route-cycle-301');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('respondToRoute & completeRoute & listMyRoutes & getRouteById', () => {
    it('calls POST /routes/:routeId/respond with ACCEPTED or REJECTED decision', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        ...sampleApiRoute,
        status: 'CONFIRMED',
      });

      const updated = await routesService.respondToRoute(
        'route-cycle-301',
        'ACCEPTED',
        'Listo para el intercambio',
      );

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/routes/route-cycle-301/respond', {
        decision: 'ACCEPTED',
        comment: 'Listo para el intercambio',
      });
      expect(updated.status).toBe('CONFIRMED');
    });

    it('calls POST /routes/:routeId/complete to finalize the swap cycle', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        ...sampleApiRoute,
        status: 'COMPLETED',
      });

      const completed = await routesService.completeRoute('route-cycle-301');

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/routes/route-cycle-301/complete');
      expect(completed.status).toBe('COMPLETED');
    });

    it('calls GET /routes and GET /routes/:id', async () => {
      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce([sampleApiRoute])
        .mockResolvedValueOnce(sampleApiRoute);

      const list = await routesService.listMyRoutes();
      expect(getSpy).toHaveBeenNthCalledWith(1, '/routes');
      expect(list).toHaveLength(1);

      const single = await routesService.getRouteById('route-cycle-301');
      expect(getSpy).toHaveBeenNthCalledWith(2, '/routes/route-cycle-301');
      expect(single.id).toBe('route-cycle-301');
    });
  });
});
