import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Item,
  ItemStatus,
  Prisma,
  RouteStatus,
  StepAcceptance,
  User,
  Want,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEmbeddingService } from '../ai/services/ai-embedding.service';
import { AiLocale } from '../ai/dto/ai-locale.dto';
import { AiExplainerService } from '../ai/services/ai-explainer.service';
import { ProposeRouteDto } from './dto/propose-route.dto';
import { RespondRouteDto } from './dto/respond-route.dto';
import { SearchRoutesDto } from './dto/search-routes.dto';
import { RouteScoringStrategy } from './engine/route-scoring.strategy';
import {
  GraphItemNode,
  GraphWantNode,
  SwapCycleCandidate,
  SwapGraphEngine,
} from './engine/swap-graph.engine';
import {
  RouteMapper,
  SwapRouteDto,
  SwapRouteWithRelations,
} from './mappers/route.mapper';

const PROPOSAL_TTL_MS = 48 * 60 * 60 * 1000;
const TOP_EXPLAINED_CYCLES = 3;

export const ROUTE_RELATIONS_INCLUDE = {
  steps: {
    orderBy: {
      stepOrder: 'asc' as const,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          initials: true,
          avatarUrl: true,
          location: true,
          rating: true,
        },
      },
      givesItem: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          category: true,
          condition: true,
          estimatedValue: true,
          images: true,
          location: true,
          status: true,
        },
      },
      receivesItem: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          category: true,
          condition: true,
          estimatedValue: true,
          images: true,
          location: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.SwapRouteInclude;

type CatalogItemRow = Item & {
  owner: Pick<
    User,
    | 'id'
    | 'name'
    | 'initials'
    | 'avatarUrl'
    | 'location'
    | 'level'
    | 'rating'
    | 'tradesCompleted'
    | 'co2SavedKg'
  > & {
    wants?: Want[];
  };
  wants: Want[];
};

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly swapGraphEngine: SwapGraphEngine,
    private readonly scoringStrategy: RouteScoringStrategy,
    private readonly routeMapper: RouteMapper,
    private readonly aiEmbeddingService: AiEmbeddingService,
    private readonly aiExplainerService: AiExplainerService,
  ) {}

  /**
   * Discovers multi-hop circular barter routes starting from `userId` and enriches
   * the top 3 ranked cycles with concise AI explanations in the requested locale.
   */
  async searchRoutes(
    userId: string,
    dto: SearchRoutesDto,
  ): Promise<SwapRouteDto[]> {
    const activeItems = (await this.prisma.item.findMany({
      where: {
        status: ItemStatus.AVAILABLE,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            initials: true,
            avatarUrl: true,
            location: true,
            level: true,
            rating: true,
            tradesCompleted: true,
            co2SavedKg: true,
            wants: true,
          },
        },
        wants: true,
      },
    })) as CatalogItemRow[];

    const catalog = activeItems.map((item) => this.toGraphItemNode(item));

    const objectiveEmbedding = await this.aiEmbeddingService.generateEmbedding(
      dto.objectiveText,
    );

    const discoveredCycles = this.swapGraphEngine.findCycles({
      initiatorUserId: userId,
      objectiveText: dto.objectiveText,
      objectiveEmbedding,
      offeredItemId: dto.offeredItemId,
      desiredCategory: dto.desiredCategory,
      maxSteps: dto.maxSteps,
      valueTolerancePct: dto.valueTolerancePct,
      catalog,
    });

    if (discoveredCycles.length === 0) {
      return [];
    }

    const topCycles = discoveredCycles.slice(0, TOP_EXPLAINED_CYCLES);
    const explanations = await Promise.all(
      topCycles.map(async (cycle) =>
        this.generateCycleExplanationSafe(cycle, dto.locale),
      ),
    );

    return discoveredCycles.map((cycle, idx) => {
      const explanation = idx < explanations.length ? explanations[idx] : null;
      return this.routeMapper.fromDiscoveredCycle(cycle, userId, explanation);
    });
  }

  /**
   * Atomically proposes a swap route, locking all involved items (`PENDING_SWAP` / `LOCKED_IN_PROPOSAL`),
   * auto-accepting the initiator's step, and notifying all non-initiator participants.
   */
  async proposeRoute(
    initiatorId: string,
    dto: ProposeRouteDto,
  ): Promise<SwapRouteDto> {
    const normalizedSteps = this.normalizeProposalSteps(dto.steps);
    this.assertClosedCycle(normalizedSteps);
    const hasInitiatorStep = normalizedSteps.some(
      (step) => step.userId === initiatorId,
    );

    if (!hasInitiatorStep) {
      throw new BadRequestException(
        'The route initiator must be included as a participant in steps',
      );
    }

    const uniqueItemIds = this.collectUniqueItemIds(normalizedSteps);

    const createdRoute = await this.prisma.$transaction(async (tx) => {
      const existingItems = await tx.item.findMany({
        where: {
          id: { in: uniqueItemIds },
        },
      });

      if (existingItems.length !== uniqueItemIds.length) {
        throw new NotFoundException(
          'One or more items referenced in the proposed swap route do not exist',
        );
      }

      const itemById = new Map<string, Item>();
      for (const item of existingItems) {
        if (!this.isItemAvailableForProposal(item.status)) {
          throw new ConflictException(
            `Item "${item.name}" (${item.id}) is not currently ACTIVE and cannot be locked in a proposal`,
          );
        }
        itemById.set(item.id, item);
      }

      for (const step of normalizedSteps) {
        const givesItem = itemById.get(step.givesItemId);
        if (givesItem && givesItem.ownerId && givesItem.ownerId !== step.userId) {
          throw new BadRequestException(
            `Item "${givesItem.id}" is not owned by participant "${step.userId}"`,
          );
        }
      }

      const code = await this.generateUniqueRouteCode(tx);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PROPOSAL_TTL_MS);
      const co2SavedKg = this.scoringStrategy.computeCo2SavedKg(
        normalizedSteps.length,
      );

      const route = await tx.swapRoute.create({
        data: {
          code,
          initiatorId,
          objectiveText: dto.objectiveText.trim(),
          matchScore: dto.matchScore,
          status: RouteStatus.ACTIVE,
          aiExplanation: dto.aiExplanation?.trim() || null,
          co2SavedKg,
          expiresAt,
          steps: {
            create: normalizedSteps.map((step) => ({
              stepOrder: step.stepOrder,
              userId: step.userId,
              givesItemId: step.givesItemId,
              receivesItemId: step.receivesItemId,
              acceptance:
                step.userId === initiatorId
                  ? StepAcceptance.ACCEPTED
                  : StepAcceptance.PENDING,
              respondedAt: step.userId === initiatorId ? now : null,
              deliveryConfirmed: false,
            })),
          },
        },
        include: ROUTE_RELATIONS_INCLUDE,
      });

      // Conditional lock: a concurrent proposal that already locked any item makes the count fall short.
      const lockResult = await tx.item.updateMany({
        where: {
          id: { in: uniqueItemIds },
          status: ItemStatus.AVAILABLE,
        },
        data: {
          status: ItemStatus.PENDING_SWAP,
        },
      });

      if (lockResult.count !== uniqueItemIds.length) {
        throw new ConflictException(
          'One or more items were locked by another proposal at the same time',
        );
      }

      const nonInitiatorUserIds = Array.from(
        new Set(
          normalizedSteps
            .map((step) => step.userId)
            .filter((uid) => uid !== initiatorId),
        ),
      );

      if (nonInitiatorUserIds.length > 0) {
        await tx.notification.createMany({
          data: nonInitiatorUserIds.map((participantId) => ({
            userId: participantId,
            type: 'ROUTE_PROPOSAL',
            badge: 'Nueva ruta circular',
            title: `Propuesta de trueque ${code}`,
            body: `Has sido invitado a una ruta circular de ${normalizedSteps.length} pasos (${code}) para "${dto.objectiveText.trim()}". Revisa y responde antes de 48 horas.`,
            routeId: route.id,
          })),
        });
      }

      return route;
    });

    return this.routeMapper.toDto(createdRoute as SwapRouteWithRelations);
  }

  /**
   * Lists all persisted swap routes where `userId` is either the initiator or a step participant,
   * ordered by `updatedAt DESC`.
   */
  async listMyRoutes(userId: string): Promise<SwapRouteDto[]> {
    const routes = await this.prisma.swapRoute.findMany({
      where: {
        OR: [{ initiatorId: userId }, { steps: { some: { userId } } }],
      },
      include: ROUTE_RELATIONS_INCLUDE,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return this.routeMapper.toDtoList(routes as SwapRouteWithRelations[]);
  }

  /**
   * Retrieves a single persisted swap route by ID (or human-readable `SW-XXXX` code).
   */
  async getRouteById(userId: string, routeId: string): Promise<SwapRouteDto> {
    const trimmedId = routeId.trim();
    let route = await this.prisma.swapRoute.findUnique({
      where: { id: trimmedId },
      include: ROUTE_RELATIONS_INCLUDE,
    });

    if (!route && /^S[WR]-\d+$/i.test(trimmedId)) {
      route = await this.prisma.swapRoute.findUnique({
        where: { code: trimmedId.toUpperCase() },
        include: ROUTE_RELATIONS_INCLUDE,
      });
    }

    const isParticipant =
      route !== null &&
      (route.initiatorId === userId ||
        route.steps.some((step) => step.userId === userId));

    if (!route || !isParticipant) {
      throw new NotFoundException(`SwapRoute "${routeId}" not found`);
    }

    return this.routeMapper.toDto(route as SwapRouteWithRelations);
  }

  /**
   * Records a participant's `ACCEPTED` or `REJECTED` consensus decision inside a transaction.
   * - On `REJECTED`: cancels the route, unlocks all items back to `AVAILABLE` (`ACTIVE`), and notifies participants.
   * - On unanimous `ACCEPTED`: transitions the route to `CONFIRMED` and notifies all participants.
   */
  async respondToRoute(
    userId: string,
    routeId: string,
    dto: RespondRouteDto,
  ): Promise<SwapRouteDto> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lockRouteRow(tx, routeId.trim());
      const route = await tx.swapRoute.findUnique({
        where: { id: routeId.trim() },
        include: ROUTE_RELATIONS_INCLUDE,
      });

      if (!route) {
        throw new NotFoundException(`SwapRoute "${routeId}" not found`);
      }

      const participantStep = route.steps.find(
        (step) => step.userId === userId,
      );
      if (!participantStep) {
        throw new ForbiddenException(
          'You are not a participant in this swap route',
        );
      }

      if (!this.isRouteInProposedState(route.status)) {
        throw new ConflictException(
          `Cannot respond to a swap route with status "${RouteMapper.mapRouteStatus(route.status)}"`,
        );
      }

      const involvedItemIds = this.collectUniqueItemIds(route.steps);
      const now = new Date();

      if (route.expiresAt && new Date(route.expiresAt).getTime() < now.getTime()) {
        await tx.swapRoute.update({
          where: { id: route.id },
          data: { status: RouteStatus.EXPIRED },
        });
        await tx.item.updateMany({
          where: { id: { in: involvedItemIds } },
          data: { status: ItemStatus.AVAILABLE },
        });
        // Returned instead of thrown so the expiry and item unlock are committed.
        return { expiredCode: route.code };
      }

      const nextAcceptance =
        dto.decision === 'ACCEPTED'
          ? StepAcceptance.ACCEPTED
          : StepAcceptance.DECLINED;

      await tx.swapRouteStep.update({
        where: { id: participantStep.id },
        data: {
          acceptance: nextAcceptance,
          respondedAt: now,
        },
      });

      const allParticipantIds = Array.from(
        new Set(route.steps.map((step) => step.userId)),
      );

      if (dto.decision === 'REJECTED') {
        const cancelledRoute = await tx.swapRoute.update({
          where: { id: route.id },
          data: {
            status: RouteStatus.CANCELLED,
          },
          include: ROUTE_RELATIONS_INCLUDE,
        });

        await tx.item.updateMany({
          where: {
            id: { in: involvedItemIds },
          },
          data: {
            status: ItemStatus.AVAILABLE,
          },
        });

        const recipients = allParticipantIds.filter((uid) => uid !== userId);
        if (recipients.length > 0) {
          const reasonSuffix = dto.comment
            ? ` Motivo: "${dto.comment.trim()}".`
            : '';
          await tx.notification.createMany({
            data: recipients.map((uid) => ({
              userId: uid,
              type: 'ROUTE_CANCELLED',
              badge: 'Ruta cancelada',
              title: `Ruta ${route.code} cancelada`,
              body: `Un participante rechazó la propuesta ${route.code}.${reasonSuffix} Tus artículos han vuelto a estar activos en el catálogo.`,
              routeId: route.id,
            })),
          });
        }

        return { route: cancelledRoute };
      }

      const allAccepted = route.steps.every((step) =>
        step.id === participantStep.id
          ? true
          : step.acceptance === StepAcceptance.ACCEPTED,
      );

      if (allAccepted) {
        const confirmedRoute = await tx.swapRoute.update({
          where: { id: route.id },
          data: {
            status: RouteStatus.CONFIRMED,
          },
          include: ROUTE_RELATIONS_INCLUDE,
        });

        await tx.notification.createMany({
          data: allParticipantIds.map((uid) => ({
            userId: uid,
            type: 'ROUTE_CONFIRMED',
            badge: 'Trueque confirmado',
            title: `¡Ruta ${route.code} confirmada!`,
            body: `Todos los participantes aceptaron la ruta circular ${route.code}. Ya pueden coordinar la entrega de sus artículos.`,
            routeId: route.id,
          })),
        });

        return { route: confirmedRoute };
      }

      return {
        route: await tx.swapRoute.findUniqueOrThrow({
          where: { id: route.id },
          include: ROUTE_RELATIONS_INCLUDE,
        }),
      };
    });

    if ('expiredCode' in outcome) {
      throw new ConflictException(
        `Swap route "${outcome.expiredCode}" has expired and items have been unlocked`,
      );
    }

    return this.routeMapper.toDto(outcome.route as SwapRouteWithRelations);
  }

  /**
   * Confirms step delivery and, once all steps are confirmed (or when finalized by the initiator
   * on a `CONFIRMED` route), completes the swap route, marks all items as `SWAPPED` (`TRADED`),
   * increments `tradesCompleted` and `co2SavedKg` for every participant, and sends notifications.
   */
  async completeRoute(
    userId: string,
    routeId: string,
  ): Promise<SwapRouteDto> {
    const finalizedRoute = await this.prisma.$transaction(async (tx) => {
      await this.lockRouteRow(tx, routeId.trim());
      const route = await tx.swapRoute.findUnique({
        where: { id: routeId.trim() },
        include: ROUTE_RELATIONS_INCLUDE,
      });

      if (!route) {
        throw new NotFoundException(`SwapRoute "${routeId}" not found`);
      }

      const userStep = route.steps.find((step) => step.userId === userId);
      const isInitiator = route.initiatorId === userId;

      if (!userStep && !isInitiator) {
        throw new ForbiddenException(
          'You are not authorized to complete this swap route',
        );
      }

      if (String(route.status).toUpperCase() !== RouteStatus.CONFIRMED) {
        throw new ConflictException(
          `Only CONFIRMED routes can be completed (current status: "${RouteMapper.mapRouteStatus(route.status)}")`,
        );
      }

      if (isInitiator) {
        await tx.swapRouteStep.updateMany({
          where: { routeId: route.id },
          data: { deliveryConfirmed: true },
        });
      } else if (userStep) {
        await tx.swapRouteStep.update({
          where: { id: userStep.id },
          data: { deliveryConfirmed: true },
        });
      }

      const allDelivered =
        isInitiator ||
        route.steps.every((step) =>
          userStep && step.id === userStep.id
            ? true
            : Boolean(step.deliveryConfirmed),
        );

      if (!allDelivered) {
        return tx.swapRoute.findUniqueOrThrow({
          where: { id: route.id },
          include: ROUTE_RELATIONS_INCLUDE,
        });
      }

      const completed = await tx.swapRoute.update({
        where: { id: route.id },
        data: {
          status: RouteStatus.COMPLETED,
        },
        include: ROUTE_RELATIONS_INCLUDE,
      });

      const involvedItemIds = this.collectUniqueItemIds(route.steps);
      await tx.item.updateMany({
        where: {
          id: { in: involvedItemIds },
        },
        data: {
          status: ItemStatus.SWAPPED,
        },
      });

      const participantIds = Array.from(
        new Set(route.steps.map((step) => step.userId)),
      );
      const totalCo2 =
        route.co2SavedKg > 0
          ? route.co2SavedKg
          : this.scoringStrategy.computeCo2SavedKg(route.steps.length);
      const co2PerParticipant = Number(
        (totalCo2 / Math.max(1, participantIds.length)).toFixed(2),
      );

      await tx.user.updateMany({
        where: {
          id: { in: participantIds },
        },
        data: {
          tradesCompleted: { increment: 1 },
          co2SavedKg: { increment: co2PerParticipant },
        },
      });

      if (participantIds.length > 0) {
        await tx.notification.createMany({
          data: participantIds.map((uid) => ({
            userId: uid,
            type: 'ROUTE_COMPLETED',
            badge: 'Trueque completado',
            title: `¡Trueque ${route.code} finalizado con éxito!`,
            body: `La ruta circular ${route.code} se completó exitosamente, ahorrando ${totalCo2.toFixed(1)} kg de CO₂ en la comunidad SmartSwap.`,
            routeId: route.id,
          })),
        });
      }

      return completed;
    });

    return this.routeMapper.toDto(finalizedRoute as SwapRouteWithRelations);
  }

  private toGraphItemNode(item: CatalogItemRow): GraphItemNode {
    const mergedWants = this.mergeItemAndOwnerWants(
      item.id,
      item.wants ?? [],
      item.owner?.wants ?? [],
    );

    return {
      id: item.id,
      ownerId: item.ownerId,
      owner: {
        id: item.owner?.id ?? item.ownerId,
        name: item.owner?.name ?? 'SmartSwap User',
        initials: item.owner?.initials ?? 'SU',
        avatarUrl: item.owner?.avatarUrl ?? null,
        location: item.owner?.location ?? item.location ?? 'Colombia',
        level: item.owner?.level ?? 1,
        rating: item.owner?.rating ?? 5.0,
        tradesCompleted: item.owner?.tradesCompleted ?? 0,
        co2SavedKg: item.owner?.co2SavedKg ?? 0,
      },
      name: item.name,
      category: item.category,
      condition: String(item.condition),
      description: item.description,
      estimatedValue: item.estimatedValue ?? 0,
      location: item.location ?? item.owner?.location ?? 'Colombia',
      status: String(item.status),
      images: Array.isArray(item.images) ? item.images : [],
      aiTags: Array.isArray(item.aiTags) ? item.aiTags : [],
      embedding: Array.isArray(item.embedding) ? item.embedding : [],
      wants: mergedWants,
    };
  }

  private mergeItemAndOwnerWants(
    itemId: string,
    itemWants: Want[],
    ownerWants: Want[],
  ): GraphWantNode[] {
    const relevantOwnerWants =
      itemWants.length > 0
        ? ownerWants.filter((w) => !w.itemId || w.itemId === itemId)
        : ownerWants;

    const combined = [...itemWants, ...relevantOwnerWants];
    const seen = new Set<string>();
    const result: GraphWantNode[] = [];

    for (const want of combined) {
      const dedupeKey = want.id || want.queryText.trim().toLowerCase();
      if (!dedupeKey || seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      result.push({
        id: want.id,
        queryText: want.queryText,
        category: want.category,
        minValue: want.minValue,
        maxValue: want.maxValue,
        embedding: Array.isArray(want.embedding) ? want.embedding : [],
      });
    }

    return result;
  }

  private async generateCycleExplanationSafe(
    cycle: SwapCycleCandidate,
    locale: AiLocale,
  ): Promise<string | null> {
    try {
      const explanationResult = await this.aiExplainerService.explainSwapRoute({
        locale,
        objectiveText: cycle.objectiveText || 'Trueque circular SmartSwap',
        steps: cycle.steps.map((step) => ({
          userName: step.userName,
          givesItemName: step.givesItemName,
          givesItemValue: step.givesItemValue,
          receivesItemName: step.receivesItemName,
          receivesItemValue: step.receivesItemValue,
        })),
      });
      return explanationResult.explanation;
    } catch {
      return null;
    }
  }

  private normalizeProposalSteps(
    steps: ProposeRouteDto['steps'],
  ): ProposeRouteDto['steps'] {
    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const seenOrders = new Set<number>();
    let hasDuplicateOrder = false;

    for (const step of sorted) {
      if (seenOrders.has(step.stepOrder)) {
        hasDuplicateOrder = true;
        break;
      }
      seenOrders.add(step.stepOrder);
    }

    if (!hasDuplicateOrder) {
      return sorted;
    }

    return sorted.map((step, index) => ({
      ...step,
      stepOrder: index,
    }));
  }

  /**
   * Every item must be given exactly once and received exactly once, so the steps form a closed cycle.
   */
  private assertClosedCycle(steps: ProposeRouteDto['steps']): void {
    const givenIds = steps.map((step) => step.givesItemId.trim());
    const receivedIds = steps.map((step) => step.receivesItemId.trim());
    const givenSet = new Set(givenIds);

    const isClosedCycle =
      givenSet.size === givenIds.length &&
      new Set(receivedIds).size === receivedIds.length &&
      receivedIds.every((id) => givenSet.has(id)) &&
      steps.every(
        (step) => step.givesItemId.trim() !== step.receivesItemId.trim(),
      );

    if (!isClosedCycle) {
      throw new BadRequestException(
        'Proposed steps must form a closed swap cycle where every item is given and received exactly once',
      );
    }
  }

  /**
   * Takes a row-level write lock on the route so concurrent responses are serialized
   * (otherwise two last acceptors could each miss the other's acceptance).
   */
  private async lockRouteRow(
    tx: Prisma.TransactionClient,
    routeId: string,
  ): Promise<void> {
    await tx.swapRoute.updateMany({
      where: { id: routeId },
      data: { updatedAt: new Date() },
    });
  }

  private collectUniqueItemIds(
    steps: Array<{ givesItemId: string; receivesItemId: string }>,
  ): string[] {
    const ids = new Set<string>();
    for (const step of steps) {
      ids.add(step.givesItemId.trim());
      ids.add(step.receivesItemId.trim());
    }
    return Array.from(ids);
  }

  private isItemAvailableForProposal(status: ItemStatus | string): boolean {
    const upper = String(status).trim().toUpperCase();
    return upper === ItemStatus.AVAILABLE || upper === 'ACTIVE';
  }

  private isRouteInProposedState(status: RouteStatus | string): boolean {
    const upper = String(status).trim().toUpperCase();
    return (
      upper === RouteStatus.ACTIVE ||
      upper === RouteStatus.SUGGESTED ||
      upper === 'PROPOSED'
    );
  }

  private async generateUniqueRouteCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const random4Digits = Math.floor(1000 + Math.random() * 9000);
      const candidate = `SW-${random4Digits}`;
      const existing = await tx.swapRoute.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }
    const fallbackDigits = (Date.now() % 9000) + 1000;
    return `SW-${fallbackDigits}`;
  }
}
