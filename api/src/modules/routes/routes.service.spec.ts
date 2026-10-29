import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ItemCondition,
  ItemStatus,
  RouteStatus,
  StepAcceptance,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEmbeddingService } from '../ai/services/ai-embedding.service';
import { AiExplainerService } from '../ai/services/ai-explainer.service';
import { ProposeRouteDto } from './dto/propose-route.dto';
import { GeoService } from '../geo/geo.service';
import { RouteScoringStrategy } from './engine/route-scoring.strategy';
import { SwapGraphEngine } from './engine/swap-graph.engine';
import { RouteMapper, SwapRouteWithRelations } from './mappers/route.mapper';
import { RoutesService } from './routes.service';

describe('RoutesService', () => {
  let routesService: RoutesService;
  let aiEmbeddingService: jest.Mocked<
    Pick<AiEmbeddingService, 'generateEmbedding'>
  >;
  let aiExplainerService: jest.Mocked<
    Pick<AiExplainerService, 'explainSwapRoute'>
  >;

  const userAId = '10000000-0000-4000-8000-000000000001';
  const userBId = '10000000-0000-4000-8000-000000000002';
  const userCId = '10000000-0000-4000-8000-000000000003';

  const itemAId = '20000000-0000-4000-8000-000000000001';
  const itemBId = '20000000-0000-4000-8000-000000000002';
  const itemCId = '20000000-0000-4000-8000-000000000005';
  const routeId = '30000000-0000-4000-8000-000000000001';

  const fixedNow = new Date('2026-10-24T18:00:00.000Z');
  const futureExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

  function buildCatalogRows() {
    return [
      {
        id: itemAId,
        ownerId: userAId,
        name: 'MacBook Air M1 256GB',
        category: 'Tecnología',
        condition: ItemCondition.NEW,
        description: 'Portátil Apple MacBook Air M1 impecable',
        estimatedValue: 650,
        location: 'Pasto, Colombia',
        status: ItemStatus.AVAILABLE,
        images: ['https://example.com/macbook.jpg'],
        aiTags: ['macbook', 'laptop'],
        embedding: [0.9, 0.1, 0, 0],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        owner: {
          id: userAId,
          name: 'Alex Rivera',
          initials: 'AR',
          avatarUrl: null,
          location: 'Pasto, Colombia',
          level: 3,
          rating: 4.9,
          tradesCompleted: 14,
          co2SavedKg: 48.5,
          wants: [],
        },
        wants: [
          {
            id: 'want-a1',
            userId: userAId,
            itemId: itemAId,
            queryText: 'Monitor Ultrawide LG',
            category: 'Tecnología',
            minValue: null,
            maxValue: null,
            embedding: [0, 0, 0.9, 0.1],
            createdAt: fixedNow,
          },
        ],
      },
      {
        id: itemBId,
        ownerId: userBId,
        name: 'Cámara Sony Alpha a6400',
        category: 'Fotografía',
        condition: ItemCondition.LIKE_NEW,
        description: 'Cámara mirrorless Sony Alpha 4K',
        estimatedValue: 680,
        location: 'Medellín, Colombia',
        status: ItemStatus.AVAILABLE as ItemStatus,
        images: ['https://example.com/camera.jpg'],
        aiTags: ['camara', 'sony'],
        embedding: [0, 0.9, 0.1, 0],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        owner: {
          id: userBId,
          name: 'Valeria Gómez',
          initials: 'VG',
          avatarUrl: null,
          location: 'Medellín, Colombia',
          level: 2,
          rating: 4.8,
          tradesCompleted: 9,
          co2SavedKg: 31.2,
          wants: [],
        },
        wants: [
          {
            id: 'want-b1',
            userId: userBId,
            itemId: itemBId,
            queryText: 'MacBook Air M1',
            category: 'Tecnología',
            minValue: null,
            maxValue: null,
            embedding: [0.9, 0.1, 0, 0],
            createdAt: fixedNow,
          },
        ],
      },
      {
        id: itemCId,
        ownerId: userCId,
        name: 'Monitor Ultrawide LG 34 WQHD',
        category: 'Tecnología',
        condition: ItemCondition.LIKE_NEW,
        description: 'Monitor curvo IPS 34 pulgadas',
        estimatedValue: 640,
        location: 'Cali, Colombia',
        status: ItemStatus.AVAILABLE,
        images: ['https://example.com/monitor.jpg'],
        aiTags: ['monitor', 'lg', 'ultrawide'],
        embedding: [0, 0, 0.9, 0.1],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        owner: {
          id: userCId,
          name: 'Camila Torres',
          initials: 'CT',
          avatarUrl: null,
          location: 'Cali, Colombia',
          level: 1,
          rating: 4.7,
          tradesCompleted: 5,
          co2SavedKg: 17.8,
          wants: [],
        },
        wants: [
          {
            id: 'want-c1',
            userId: userCId,
            itemId: itemCId,
            queryText: 'Cámara Sony Alpha',
            category: 'Fotografía',
            minValue: null,
            maxValue: null,
            embedding: [0, 0.9, 0.1, 0],
            createdAt: fixedNow,
          },
        ],
      },
    ];
  }

  function buildPersisted3HopRoute(overrides?: {
    status?: RouteStatus;
    stepBAcceptance?: StepAcceptance;
    stepCAcceptance?: StepAcceptance;
    itemStatus?: ItemStatus;
    allDelivered?: boolean;
  }): SwapRouteWithRelations {
    const status = overrides?.status ?? RouteStatus.ACTIVE;
    const stepBAcceptance =
      overrides?.stepBAcceptance ?? StepAcceptance.PENDING;
    const stepCAcceptance =
      overrides?.stepCAcceptance ?? StepAcceptance.PENDING;
    const itemStatus = overrides?.itemStatus ?? ItemStatus.PENDING_SWAP;
    const delivered = overrides?.allDelivered ?? false;

    const itemSummaryA = {
      id: itemAId,
      ownerId: userAId,
      name: 'MacBook Air M1 256GB',
      category: 'Tecnología',
      condition: ItemCondition.NEW,
      estimatedValue: 650,
      images: ['https://example.com/macbook.jpg'],
      location: 'Pasto, Colombia',
      status: itemStatus,
    };

    const itemSummaryB = {
      id: itemBId,
      ownerId: userBId,
      name: 'Cámara Sony Alpha a6400',
      category: 'Fotografía',
      condition: ItemCondition.LIKE_NEW,
      estimatedValue: 680,
      images: ['https://example.com/camera.jpg'],
      location: 'Medellín, Colombia',
      status: itemStatus,
    };

    const itemSummaryC = {
      id: itemCId,
      ownerId: userCId,
      name: 'Monitor Ultrawide LG 34 WQHD',
      category: 'Tecnología',
      condition: ItemCondition.LIKE_NEW,
      estimatedValue: 640,
      images: ['https://example.com/monitor.jpg'],
      location: 'Cali, Colombia',
      status: itemStatus,
    };

    return {
      id: routeId,
      code: 'SW-4821',
      initiatorId: userAId,
      objectiveText: 'Monitor Ultrawide LG',
      matchScore: 93,
      status,
      aiExplanation:
        'Ruta circular equilibrada de 3 pasos con alta paridad de valor comercial.',
      co2SavedKg: 7.2,
      expiresAt: futureExpiry,
      createdAt: fixedNow,
      updatedAt: fixedNow,
      steps: [
        {
          id: 'step-0',
          routeId,
          stepOrder: 0,
          userId: userAId,
          givesItemId: itemAId,
          receivesItemId: itemCId,
          acceptance: StepAcceptance.ACCEPTED,
          respondedAt: fixedNow,
          deliveryConfirmed: delivered,
          createdAt: fixedNow,
          updatedAt: fixedNow,
          user: {
            id: userAId,
            name: 'Alex Rivera',
            initials: 'AR',
            avatarUrl: null,
            location: 'Pasto, Colombia',
            rating: 4.9,
          },
          givesItem: itemSummaryA,
          receivesItem: itemSummaryC,
        },
        {
          id: 'step-1',
          routeId,
          stepOrder: 1,
          userId: userBId,
          givesItemId: itemBId,
          receivesItemId: itemAId,
          acceptance: stepBAcceptance,
          respondedAt: stepBAcceptance !== StepAcceptance.PENDING ? fixedNow : null,
          deliveryConfirmed: delivered,
          createdAt: fixedNow,
          updatedAt: fixedNow,
          user: {
            id: userBId,
            name: 'Valeria Gómez',
            initials: 'VG',
            avatarUrl: null,
            location: 'Medellín, Colombia',
            rating: 4.8,
          },
          givesItem: itemSummaryB,
          receivesItem: itemSummaryA,
        },
        {
          id: 'step-2',
          routeId,
          stepOrder: 2,
          userId: userCId,
          givesItemId: itemCId,
          receivesItemId: itemBId,
          acceptance: stepCAcceptance,
          respondedAt: stepCAcceptance !== StepAcceptance.PENDING ? fixedNow : null,
          deliveryConfirmed: delivered,
          createdAt: fixedNow,
          updatedAt: fixedNow,
          user: {
            id: userCId,
            name: 'Camila Torres',
            initials: 'CT',
            avatarUrl: null,
            location: 'Cali, Colombia',
            rating: 4.7,
          },
          givesItem: itemSummaryC,
          receivesItem: itemSummaryB,
        },
      ],
    };
  }

  const mockTx = {
    item: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    swapRoute: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    swapRouteStep: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
    user: {
      updateMany: jest.fn(),
    },
  };

  const mockPrismaService = {
    item: {
      findMany: jest.fn(),
    },
    swapRoute: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(
      async <T>(callback: (tx: typeof mockTx) => Promise<T>): Promise<T> =>
        callback(mockTx),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    aiEmbeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue([0, 0, 0.9, 0.1]),
    };

    aiExplainerService = {
      explainSwapRoute: jest.fn().mockResolvedValue({
        explanation:
          'Esta ruta circular de 3 eslabones conecta a Alex Rivera, Valeria Gómez y Camila Torres con equidad comercial. Al reutilizar estos artículos se evitan emisiones de CO₂.',
        fairnessScore: 95,
        source: 'fallback',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        GeoService,
        RouteMapper,
        SwapGraphEngine,
        RouteScoringStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiEmbeddingService,
          useValue: aiEmbeddingService,
        },
        {
          provide: AiExplainerService,
          useValue: aiExplainerService,
        },
      ],
    }).compile();

    routesService = module.get<RoutesService>(RoutesService);
  });

  describe('1. searchRoutes', () => {
    it('discovers circular routes from active items and enriches top cycles with AiExplainerService', async () => {
      mockPrismaService.item.findMany.mockResolvedValue(buildCatalogRows());

      const results = await routesService.searchRoutes(userAId, {
        objectiveText: 'Monitor Ultrawide LG',
        maxSteps: 4,
        valueTolerancePct: 45,
        locale: 'es',
        scope: 'country',
      });

      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ItemStatus.AVAILABLE },
        }),
      );
      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Monitor Ultrawide LG',
      );
      expect(aiExplainerService.explainSwapRoute).toHaveBeenCalledTimes(1);

      expect(results).toHaveLength(1);
      const discovered = results[0];
      expect(discovered.hopCount).toBe(3);
      expect(discovered.status).toBe('PROPOSED');
      expect(discovered.code).toMatch(/^SW-\d{4}$/);
      expect(discovered.co2SavedKg).toBe(7.2);
      expect(discovered.aiExplanation).toContain('ruta circular de 3 eslabones');
      expect(discovered.steps).toHaveLength(3);
      expect(discovered.steps[0].userId).toBe(userAId);
      expect(discovered.steps[0].acceptance).toBe('ACCEPTED');
      expect(discovered.steps[1].acceptance).toBe('PENDING');
      expect(discovered.steps[0].givesItem.condition).toBe('EXCELLENT');
    });

    it('limits the catalog to the radius around the searcher municipality for the nearby scope', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        municipalityCode: '52001',
        departmentCode: '52',
      });
      mockPrismaService.item.findMany.mockResolvedValue(buildCatalogRows());

      await routesService.searchRoutes(userAId, {
        objectiveText: 'Monitor Ultrawide LG',
        maxSteps: 4,
        valueTolerancePct: 45,
        locale: 'es',
        scope: 'nearby',
        radiusKm: 70,
      });

      const where = mockPrismaService.item.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(ItemStatus.AVAILABLE);
      expect(where.municipalityCode.in).toEqual(expect.arrayContaining(['52001', '52356']));
      expect(where.municipalityCode.in).not.toContain('05001');
    });

    it('limits the catalog to the searcher department for the department scope', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        municipalityCode: '52001',
        departmentCode: '52',
      });
      mockPrismaService.item.findMany.mockResolvedValue([]);

      await routesService.searchRoutes(userAId, {
        objectiveText: 'Monitor',
        maxSteps: 4,
        valueTolerancePct: 45,
        locale: 'es',
        scope: 'department',
      });

      expect(mockPrismaService.item.findMany.mock.calls[0][0].where.departmentCode).toBe('52');
    });

    it('asks users without a registered municipality to set it before a scoped search', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        municipalityCode: null,
        departmentCode: null,
      });

      await expect(
        routesService.searchRoutes(userAId, {
          objectiveText: 'Monitor',
          maxSteps: 4,
          valueTolerancePct: 45,
          locale: 'es',
          scope: 'nearby',
        }),
      ).rejects.toThrow('Set your municipality');
      expect(mockPrismaService.item.findMany).not.toHaveBeenCalled();
    });

    it('requests route explanations in the locale of the search', async () => {
      mockPrismaService.item.findMany.mockResolvedValue(buildCatalogRows());

      await routesService.searchRoutes(userAId, {
        objectiveText: 'Monitor Ultrawide LG',
        maxSteps: 4,
        valueTolerancePct: 45,
        locale: 'en',
        scope: 'country',
      });

      expect(aiExplainerService.explainSwapRoute).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' }),
      );
    });
  });

  describe('2. proposeRoute', () => {
    const proposeDto: ProposeRouteDto = {
      objectiveText: 'Monitor Ultrawide LG',
      matchScore: 93,
      aiExplanation: 'Ruta circular equilibrada de 3 pasos.',
      steps: [
        {
          stepOrder: 0,
          userId: userAId,
          givesItemId: itemAId,
          receivesItemId: itemCId,
        },
        {
          stepOrder: 1,
          userId: userBId,
          givesItemId: itemBId,
          receivesItemId: itemAId,
        },
        {
          stepOrder: 2,
          userId: userCId,
          givesItemId: itemCId,
          receivesItemId: itemBId,
        },
      ],
    };

    it('locks all involved items, auto-accepts initiator step, sets pending for others, and creates notifications inside $transaction', async () => {
      mockTx.item.findMany.mockResolvedValue(buildCatalogRows());
      mockTx.swapRoute.findUnique.mockResolvedValue(null);
      mockTx.swapRoute.create.mockResolvedValue(buildPersisted3HopRoute());
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });
      mockTx.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await routesService.proposeRoute(userAId, proposeDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      // Verify initiator step is auto-accepted and other steps are PENDING
      expect(mockTx.swapRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            initiatorId: userAId,
            status: RouteStatus.ACTIVE,
            co2SavedKg: 7.2,
            code: expect.stringMatching(/^SW-\d{4}$/),
            steps: {
              create: [
                expect.objectContaining({
                  stepOrder: 0,
                  userId: userAId,
                  acceptance: StepAcceptance.ACCEPTED,
                }),
                expect.objectContaining({
                  stepOrder: 1,
                  userId: userBId,
                  acceptance: StepAcceptance.PENDING,
                }),
                expect.objectContaining({
                  stepOrder: 2,
                  userId: userCId,
                  acceptance: StepAcceptance.PENDING,
                }),
              ],
            },
          }),
        }),
      );

      // Verify all involved items are locked (PENDING_SWAP -> mapped as LOCKED_IN_PROPOSAL)
      expect(mockTx.item.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining([itemAId, itemBId, itemCId]) },
          status: ItemStatus.AVAILABLE,
        },
        data: {
          status: ItemStatus.PENDING_SWAP,
        },
      });

      // Verify notifications sent only to non-initiator participants (User B and User C)
      expect(mockTx.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: userBId,
            type: 'ROUTE_PROPOSAL',
            badge: 'Nueva ruta circular',
            routeId,
          }),
          expect.objectContaining({
            userId: userCId,
            type: 'ROUTE_PROPOSAL',
            badge: 'Nueva ruta circular',
            routeId,
          }),
        ]),
      });

      expect(result.id).toBe(routeId);
      expect(result.status).toBe('PROPOSED');
      expect(result.hopCount).toBe(3);
      expect(result.steps[0].givesItem.status).toBe('LOCKED_IN_PROPOSAL');
    });

    it('throws ConflictException when any item is already locked in another proposal', async () => {
      const catalogWithLocked = buildCatalogRows();
      catalogWithLocked[1].status = ItemStatus.PENDING_SWAP;
      mockTx.item.findMany.mockResolvedValue(catalogWithLocked);

      await expect(
        routesService.proposeRoute(userAId, proposeDto),
      ).rejects.toThrow(ConflictException);

      expect(mockTx.swapRoute.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent proposal locks an item first', async () => {
      mockTx.item.findMany.mockResolvedValue(buildCatalogRows());
      mockTx.swapRoute.findUnique.mockResolvedValue(null);
      mockTx.swapRoute.create.mockResolvedValue(buildPersisted3HopRoute());
      mockTx.item.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        routesService.proposeRoute(userAId, proposeDto),
      ).rejects.toThrow(ConflictException);
      expect(mockTx.notification.createMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when steps do not form a closed cycle', async () => {
      const brokenDto: ProposeRouteDto = {
        ...proposeDto,
        steps: proposeDto.steps.map((step, idx) =>
          idx === 0 ? { ...step, receivesItemId: step.givesItemId } : step,
        ),
      };

      await expect(
        routesService.proposeRoute(userAId, brokenDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('3. respondToRoute — unanimous ACCEPTED transitions to CONFIRMED', () => {
    it('transitions SwapRoute to CONFIRMED and notifies all participants when the last pending participant accepts', async () => {
      // User A (initiator) and User B have already ACCEPTED; User C is the last PENDING participant
      const routeBeforeLastAccept = buildPersisted3HopRoute({
        status: RouteStatus.ACTIVE,
        stepBAcceptance: StepAcceptance.ACCEPTED,
        stepCAcceptance: StepAcceptance.PENDING,
      });

      const routeAfterConfirmed = buildPersisted3HopRoute({
        status: RouteStatus.CONFIRMED,
        stepBAcceptance: StepAcceptance.ACCEPTED,
        stepCAcceptance: StepAcceptance.ACCEPTED,
      });

      mockTx.swapRoute.findUnique.mockResolvedValue(routeBeforeLastAccept);
      mockTx.swapRouteStep.update.mockResolvedValue({});
      mockTx.swapRoute.update.mockResolvedValue(routeAfterConfirmed);
      mockTx.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await routesService.respondToRoute(userCId, routeId, {
        decision: 'ACCEPTED',
        comment: '¡Me encanta el intercambio!',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.swapRouteStep.update).toHaveBeenCalledWith({
        where: { id: 'step-2' },
        data: {
          acceptance: StepAcceptance.ACCEPTED,
          respondedAt: expect.any(Date),
        },
      });
      expect(mockTx.swapRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: routeId },
          data: { status: RouteStatus.CONFIRMED },
        }),
      );
      expect(mockTx.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: userAId,
            type: 'ROUTE_CONFIRMED',
          }),
          expect.objectContaining({
            userId: userBId,
            type: 'ROUTE_CONFIRMED',
          }),
          expect.objectContaining({
            userId: userCId,
            type: 'ROUTE_CONFIRMED',
          }),
        ]),
      });

      expect(result.status).toBe('CONFIRMED');
      expect(result.steps.every((s) => s.acceptance === 'ACCEPTED')).toBe(true);
    });
  });

  describe('4. respondToRoute — REJECTED transitions to CANCELLED and unlocks items', () => {
    it('cancels the route, unlocks all items back to AVAILABLE (ACTIVE), and notifies participants', async () => {
      const pendingRoute = buildPersisted3HopRoute({
        status: RouteStatus.ACTIVE,
        stepBAcceptance: StepAcceptance.PENDING,
        stepCAcceptance: StepAcceptance.PENDING,
      });

      const cancelledRoute = buildPersisted3HopRoute({
        status: RouteStatus.CANCELLED,
        stepBAcceptance: StepAcceptance.DECLINED,
        stepCAcceptance: StepAcceptance.PENDING,
        itemStatus: ItemStatus.AVAILABLE,
      });

      mockTx.swapRoute.findUnique.mockResolvedValue(pendingRoute);
      mockTx.swapRouteStep.update.mockResolvedValue({});
      mockTx.swapRoute.update.mockResolvedValue(cancelledRoute);
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });
      mockTx.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await routesService.respondToRoute(userBId, routeId, {
        decision: 'REJECTED',
        comment: 'Ya comprometí mi cámara esta semana',
      });

      expect(mockTx.swapRouteStep.update).toHaveBeenCalledWith({
        where: { id: 'step-1' },
        data: {
          acceptance: StepAcceptance.DECLINED,
          respondedAt: expect.any(Date),
        },
      });
      expect(mockTx.swapRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: routeId },
          data: { status: RouteStatus.CANCELLED },
        }),
      );
      expect(mockTx.item.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining([itemAId, itemBId, itemCId]) },
        },
        data: {
          status: ItemStatus.AVAILABLE,
        },
      });
      expect(mockTx.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: userAId,
            type: 'ROUTE_CANCELLED',
          }),
          expect.objectContaining({
            userId: userCId,
            type: 'ROUTE_CANCELLED',
          }),
        ]),
      });

      expect(result.status).toBe('CANCELLED');
      expect(result.steps[0].givesItem.status).toBe('ACTIVE');
    });

    it('throws ForbiddenException if a non-participant tries to respond', async () => {
      mockTx.swapRoute.findUnique.mockResolvedValue(buildPersisted3HopRoute());

      await expect(
        routesService.respondToRoute('outsider-user-id', routeId, {
          decision: 'ACCEPTED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('lazy route expiry', () => {
    it('expires overdue pending routes, unlocks items and notifies participants before listing', async () => {
      mockPrismaService.swapRoute.findMany
        .mockResolvedValueOnce([
          {
            id: 'route-overdue',
            code: 'SW-1111',
            steps: [
              { userId: userAId, givesItemId: itemAId, receivesItemId: itemCId },
              { userId: userBId, givesItemId: itemBId, receivesItemId: itemAId },
            ],
          },
        ])
        .mockResolvedValueOnce([]);
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });
      mockTx.notification.createMany.mockResolvedValue({ count: 2 });

      await routesService.listMyRoutes(userAId);

      expect(mockTx.swapRoute.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'route-overdue',
          status: { in: [RouteStatus.ACTIVE, RouteStatus.SUGGESTED] },
        },
        data: { status: RouteStatus.EXPIRED },
      });
      expect(mockTx.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining([itemAId, itemBId, itemCId]) } },
        data: { status: ItemStatus.AVAILABLE },
      });
      expect(mockTx.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: userBId, type: 'ROUTE_EXPIRED' }),
        ]),
      });
    });

    it('skips routes another request already expired', async () => {
      mockPrismaService.swapRoute.findMany
        .mockResolvedValueOnce([{ id: 'route-overdue', code: 'SW-1111', steps: [] }])
        .mockResolvedValueOnce([]);
      mockTx.swapRoute.updateMany.mockResolvedValueOnce({ count: 0 });

      await routesService.listMyRoutes(userAId);

      expect(mockTx.item.updateMany).not.toHaveBeenCalled();
      expect(mockTx.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('cancelRoute', () => {
    it('cancels a pending route, unlocks its items and notifies the other participants', async () => {
      const pendingRoute = buildPersisted3HopRoute();
      mockTx.swapRoute.findUnique.mockResolvedValue(pendingRoute);
      mockTx.swapRoute.update.mockResolvedValue(
        buildPersisted3HopRoute({
          status: RouteStatus.CANCELLED,
          itemStatus: ItemStatus.AVAILABLE,
        }),
      );
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });
      mockTx.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await routesService.cancelRoute(userAId, pendingRoute.id);

      expect(mockTx.swapRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: pendingRoute.id },
          data: { status: RouteStatus.CANCELLED },
        }),
      );
      expect(mockTx.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining([itemAId, itemBId, itemCId]) } },
        data: { status: ItemStatus.AVAILABLE },
      });
      const notified = mockTx.notification.createMany.mock.calls[0][0].data.map(
        (n: { userId: string }) => n.userId,
      );
      expect(notified.sort()).toEqual([userBId, userCId].sort());
      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancellation by a participant who is not the initiator', async () => {
      mockTx.swapRoute.findUnique.mockResolvedValue(buildPersisted3HopRoute());

      await expect(
        routesService.cancelRoute(userBId, 'route-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTx.swapRoute.update).not.toHaveBeenCalled();
    });

    it('rejects cancellation of a route that is no longer pending', async () => {
      mockTx.swapRoute.findUnique.mockResolvedValue(
        buildPersisted3HopRoute({ status: RouteStatus.CONFIRMED }),
      );

      await expect(
        routesService.cancelRoute(userAId, 'route-id'),
      ).rejects.toThrow(ConflictException);
      expect(mockTx.item.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('5. completeRoute & query methods', () => {
    it('finalizes a CONFIRMED route to COMPLETED, marks items TRADED (SWAPPED), and increments tradesCompleted + co2SavedKg', async () => {
      const confirmedRoute = buildPersisted3HopRoute({
        status: RouteStatus.CONFIRMED,
        stepBAcceptance: StepAcceptance.ACCEPTED,
        stepCAcceptance: StepAcceptance.ACCEPTED,
      });

      const completedRoute = buildPersisted3HopRoute({
        status: RouteStatus.COMPLETED,
        stepBAcceptance: StepAcceptance.ACCEPTED,
        stepCAcceptance: StepAcceptance.ACCEPTED,
        itemStatus: ItemStatus.SWAPPED,
        allDelivered: true,
      });

      mockTx.swapRoute.findUnique.mockResolvedValue(confirmedRoute);
      mockTx.swapRouteStep.updateMany.mockResolvedValue({ count: 3 });
      mockTx.swapRoute.update.mockResolvedValue(completedRoute);
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });
      mockTx.user.updateMany.mockResolvedValue({ count: 3 });
      mockTx.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await routesService.completeRoute(userAId, routeId);

      expect(mockTx.swapRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: routeId },
          data: { status: RouteStatus.COMPLETED },
        }),
      );
      expect(mockTx.item.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining([itemAId, itemBId, itemCId]) },
        },
        data: { status: ItemStatus.SWAPPED },
      });
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining([userAId, userBId, userCId]) },
        },
        data: {
          tradesCompleted: { increment: 1 },
          co2SavedKg: { increment: 2.4 },
        },
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.steps[0].givesItem.status).toBe('TRADED');
      expect(result.steps.every((s) => s.deliveryConfirmed)).toBe(true);
    });

    it('throws NotFoundException in getRouteById when route does not exist', async () => {
      mockPrismaService.swapRoute.findUnique.mockResolvedValue(null);

      await expect(
        routesService.getRouteById(userAId, 'missing-route'),
      ).rejects.toThrow(NotFoundException);
    });

    it('hides a route from users who are not participants', async () => {
      mockPrismaService.swapRoute.findUnique.mockResolvedValue(
        buildPersisted3HopRoute(),
      );

      await expect(
        routesService.getRouteById('outsider-user', 'route-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('commits the EXPIRED status and item unlock before rejecting a late response', async () => {
      const expiredRoute = {
        ...buildPersisted3HopRoute({
          status: RouteStatus.ACTIVE,
          stepBAcceptance: StepAcceptance.PENDING,
          stepCAcceptance: StepAcceptance.PENDING,
        }),
        expiresAt: new Date(Date.now() - 60_000),
      };
      mockTx.swapRoute.findUnique.mockResolvedValue(expiredRoute);
      mockTx.swapRoute.update.mockResolvedValue({});
      mockTx.item.updateMany.mockResolvedValue({ count: 3 });

      await expect(
        routesService.respondToRoute(userBId, expiredRoute.id, {
          decision: 'ACCEPTED',
        }),
      ).rejects.toThrow(ConflictException);

      // The transaction callback must resolve (not throw) so the expiry is persisted.
      await expect(
        mockPrismaService.$transaction.mock.results[0].value,
      ).resolves.toEqual({ expiredCode: expiredRoute.code });
      expect(mockTx.swapRoute.update).toHaveBeenCalledWith({
        where: { id: expiredRoute.id },
        data: { status: RouteStatus.EXPIRED },
      });
    });
  });
});
