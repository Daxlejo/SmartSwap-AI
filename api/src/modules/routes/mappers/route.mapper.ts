import { Injectable } from '@nestjs/common';
import {
  Item,
  ItemCondition,
  ItemStatus,
  RouteStatus,
  StepAcceptance,
  SwapRoute,
  SwapRouteStep,
  User,
} from '@prisma/client';
import {
  NormalizedItemCondition,
  normalizeItemCondition,
} from '../../items/dto/create-item.dto';
import {
  GraphItemNode,
  SwapCycleCandidate,
} from '../engine/swap-graph.engine';

export type SwapRouteStatusDto =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type StepAcceptanceDto = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type PersistedStepUser = Pick<
  User,
  'id' | 'name' | 'initials' | 'avatarUrl' | 'location' | 'rating'
>;

export type PersistedStepItem = Pick<
  Item,
  | 'id'
  | 'ownerId'
  | 'name'
  | 'category'
  | 'condition'
  | 'estimatedValue'
  | 'images'
  | 'location'
  | 'status'
>;

export type SwapRouteStepWithRelations = SwapRouteStep & {
  user: PersistedStepUser;
  givesItem: PersistedStepItem;
  receivesItem: PersistedStepItem;
};

export type SwapRouteWithRelations = SwapRoute & {
  steps: SwapRouteStepWithRelations[];
};

export interface SwapRouteStepUserSummaryDto {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  location: string;
  rating: number;
}

export interface SwapRouteItemSummaryDto {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  estimatedValue: number;
  condition: NormalizedItemCondition;
  image: string | null;
  imageUrl: string | null;
  images: string[];
  status: string;
}

export interface SwapRouteStepDto {
  id: string;
  stepOrder: number;
  userId: string;
  userName: string;
  userInitials: string;
  userRating: number;
  userLocation: string;
  user: SwapRouteStepUserSummaryDto;
  givesItemId: string;
  receivesItemId: string;
  givesItem: SwapRouteItemSummaryDto;
  receivesItem: SwapRouteItemSummaryDto;
  acceptance: StepAcceptanceDto;
  respondedAt: string | null;
  deliveryConfirmed: boolean;
}

export interface SwapRouteDto {
  id: string;
  code: string;
  initiatorId: string;
  objectiveText: string;
  matchScore: number;
  status: SwapRouteStatusDto;
  aiExplanation: string | null;
  co2SavedKg: number;
  expiresAt: string | null;
  createdAt: string;
  hopCount: number;
  stepsCount: number;
  offeredItemId: string;
  targetItemId: string;
  isLoop: boolean;
  steps: SwapRouteStepDto[];
}

@Injectable()
export class RouteMapper {
  /**
   * Maps a persisted Prisma `SwapRoute` (with `steps`, `user`, `givesItem`, `receivesItem`)
   * into the unified `SwapRouteDto` response contract.
   */
  toDto(route: SwapRouteWithRelations): SwapRouteDto {
    const orderedSteps = [...(route.steps ?? [])].sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );

    const mappedSteps: SwapRouteStepDto[] = orderedSteps.map((step) => {
      const userInitials =
        step.user?.initials?.trim() ||
        RouteMapper.deriveInitials(step.user?.name ?? 'SU');
      const userLocation =
        step.user?.location?.trim() ||
        step.givesItem?.location?.trim() ||
        'Colombia';
      const userRating =
        typeof step.user?.rating === 'number' ? step.user.rating : 5.0;
      const userName = step.user?.name ?? 'Usuario SmartSwap';

      return {
        id: step.id,
        stepOrder: step.stepOrder,
        userId: step.userId,
        userName,
        userInitials,
        userRating,
        userLocation,
        user: {
          id: step.userId,
          name: userName,
          initials: userInitials,
          avatarUrl: step.user?.avatarUrl ?? null,
          location: userLocation,
          rating: userRating,
        },
        givesItemId: step.givesItemId,
        receivesItemId: step.receivesItemId,
        givesItem: RouteMapper.mapPersistedItem(step.givesItem),
        receivesItem: RouteMapper.mapPersistedItem(step.receivesItem),
        acceptance: RouteMapper.mapStepAcceptance(step.acceptance),
        respondedAt: step.respondedAt
          ? new Date(step.respondedAt).toISOString()
          : null,
        deliveryConfirmed: Boolean(step.deliveryConfirmed),
      };
    });

    const firstStep = mappedSteps[0];
    const lastStep = mappedSteps[mappedSteps.length - 1];

    return {
      id: route.id,
      code: route.code,
      initiatorId: route.initiatorId,
      objectiveText: route.objectiveText,
      matchScore: Math.round(route.matchScore),
      status: RouteMapper.mapRouteStatus(route.status),
      aiExplanation: route.aiExplanation ?? null,
      co2SavedKg: Number((route.co2SavedKg ?? 0).toFixed(1)),
      expiresAt: route.expiresAt
        ? new Date(route.expiresAt).toISOString()
        : null,
      createdAt: new Date(route.createdAt).toISOString(),
      hopCount: mappedSteps.length,
      stepsCount: mappedSteps.length,
      offeredItemId: firstStep?.givesItem.id ?? '',
      targetItemId:
        firstStep?.receivesItem.id ?? lastStep?.givesItem.id ?? '',
      isLoop: true,
      steps: mappedSteps,
    };
  }

  /**
   * Maps a list of persisted Prisma `SwapRoute` entities into `SwapRouteDto[]`.
   */
  toDtoList(routes: SwapRouteWithRelations[]): SwapRouteDto[] {
    return routes.map((route) => this.toDto(route));
  }

  /**
   * Maps an in-memory `SwapCycleCandidate` discovered by `SwapGraphEngine`
   * into the unified `SwapRouteDto` preview contract.
   */
  fromDiscoveredCycle(
    cycle: SwapCycleCandidate,
    initiatorId: string,
    aiExplanation?: string | null,
  ): SwapRouteDto {
    const hashNum = RouteMapper.hashCanonicalKey(cycle.canonicalKey);
    const digits = 1000 + (hashNum % 9000);
    const previewCode = `SW-${digits}`;
    const previewId = `preview-${hashNum.toString(16).padStart(8, '0')}`;
    const nowIso = new Date().toISOString();

    const itemNodeById = new Map<string, GraphItemNode>();
    for (const item of cycle.chainItems) {
      itemNodeById.set(item.id, item);
    }

    const mappedSteps: SwapRouteStepDto[] = cycle.steps.map((step) => {
      const giverNode = itemNodeById.get(step.givesItemId);
      const receiverNode = itemNodeById.get(step.receivesItemId);
      const ownerInitials =
        giverNode?.owner.initials?.trim() ||
        RouteMapper.deriveInitials(step.userName);
      const userLocation = step.userLocation ?? 'Colombia';

      return {
        id: `${previewId}-step-${step.stepOrder}`,
        stepOrder: step.stepOrder,
        userId: step.userId,
        userName: step.userName,
        userInitials: ownerInitials,
        userRating: step.userRating,
        userLocation,
        user: {
          id: step.userId,
          name: step.userName,
          initials: ownerInitials,
          avatarUrl: step.userAvatarUrl,
          location: userLocation,
          rating: step.userRating,
        },
        givesItemId: step.givesItemId,
        receivesItemId: step.receivesItemId,
        givesItem: RouteMapper.mapGraphItem(
          giverNode,
          step.givesItemId,
          step.userId,
          step.givesItemName,
          step.givesItemCategory,
          step.givesItemValue,
          step.givesItemImage,
        ),
        receivesItem: RouteMapper.mapGraphItem(
          receiverNode,
          step.receivesItemId,
          receiverNode?.ownerId ?? '',
          step.receivesItemName,
          step.receivesItemCategory,
          step.receivesItemValue,
          step.receivesItemImage,
        ),
        acceptance: step.userId === initiatorId ? 'ACCEPTED' : 'PENDING',
        respondedAt: null,
        deliveryConfirmed: false,
      };
    });

    return {
      id: previewId,
      code: previewCode,
      initiatorId,
      objectiveText: cycle.objectiveText,
      matchScore: cycle.matchScore,
      status: 'PROPOSED',
      aiExplanation: aiExplanation ?? null,
      co2SavedKg: cycle.co2SavedKg,
      expiresAt: null,
      createdAt: nowIso,
      hopCount: mappedSteps.length,
      stepsCount: mappedSteps.length,
      offeredItemId: cycle.offeredItemId,
      targetItemId: cycle.targetItemId,
      isLoop: true,
      steps: mappedSteps,
    };
  }

  static mapRouteStatus(rawStatus: RouteStatus | string): SwapRouteStatusDto {
    const upper = String(rawStatus).trim().toUpperCase();
    switch (upper) {
      case 'SUGGESTED':
      case 'ACTIVE':
      case 'PROPOSED':
        return 'PROPOSED';
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'EXPIRED':
        return 'EXPIRED';
      default:
        return 'PROPOSED';
    }
  }

  static mapStepAcceptance(
    rawAcceptance: StepAcceptance | string,
  ): StepAcceptanceDto {
    const upper = String(rawAcceptance).trim().toUpperCase();
    switch (upper) {
      case 'ACCEPTED':
        return 'ACCEPTED';
      case 'DECLINED':
      case 'REJECTED':
        return 'DECLINED';
      default:
        return 'PENDING';
    }
  }

  static mapItemCondition(
    rawCondition?: ItemCondition | string | null,
  ): NormalizedItemCondition {
    if (!rawCondition) {
      return 'GOOD';
    }
    try {
      return normalizeItemCondition(String(rawCondition));
    } catch {
      return 'GOOD';
    }
  }

  static mapItemDomainStatus(rawStatus?: ItemStatus | string | null): string {
    const upper = String(rawStatus ?? 'AVAILABLE').trim().toUpperCase();
    switch (upper) {
      case 'AVAILABLE':
      case 'ACTIVE':
        return 'ACTIVE';
      case 'PENDING_SWAP':
      case 'LOCKED_IN_PROPOSAL':
        return 'LOCKED_IN_PROPOSAL';
      case 'SWAPPED':
      case 'TRADED':
        return 'TRADED';
      case 'ARCHIVED':
      case 'PAUSED':
        return 'PAUSED';
      default:
        return 'ACTIVE';
    }
  }

  private static mapPersistedItem(
    item: PersistedStepItem,
  ): SwapRouteItemSummaryDto {
    const images = Array.isArray(item.images) ? item.images : [];
    const primaryImage = images[0] ?? null;

    return {
      id: item.id,
      ownerId: item.ownerId,
      name: item.name,
      category: item.category,
      estimatedValue: item.estimatedValue ?? 0,
      condition: RouteMapper.mapItemCondition(item.condition),
      image: primaryImage,
      imageUrl: primaryImage,
      images,
      status: RouteMapper.mapItemDomainStatus(item.status),
    };
  }

  private static mapGraphItem(
    node: GraphItemNode | undefined,
    fallbackId: string,
    fallbackOwnerId: string,
    fallbackName: string,
    fallbackCategory: string,
    fallbackValue: number,
    fallbackImage: string | null,
  ): SwapRouteItemSummaryDto {
    const images =
      node?.images && node.images.length > 0
        ? node.images
        : fallbackImage
          ? [fallbackImage]
          : [];
    const primaryImage = images[0] ?? fallbackImage ?? null;

    return {
      id: node?.id ?? fallbackId,
      ownerId: node?.ownerId ?? fallbackOwnerId,
      name: node?.name ?? fallbackName,
      category: node?.category ?? fallbackCategory,
      estimatedValue: node?.estimatedValue ?? fallbackValue,
      condition: RouteMapper.mapItemCondition(node?.condition),
      image: primaryImage,
      imageUrl: primaryImage,
      images,
      status: RouteMapper.mapItemDomainStatus(node?.status),
    };
  }

  private static deriveInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return 'SU';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private static hashCanonicalKey(key: string): number {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
