import { apiClient } from '@/services/http/apiClient';
import {
  preferencesStorage,
  type LocalePreference,
} from '@/services/storage/preferencesStorage';
import { normalizeUser, type RawUserDto } from '@/services/auth/auth.service';
import { normalizeItem, type RawItemDto } from '@/services/items/items.service';
import type { Item, Proposal, ProposalStatus, SwapRoute, User } from '@/types';

export type RouteLifecycleStatus =
  | 'SUGGESTED'
  | 'ACTIVE'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | string;

export type StepAcceptanceStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type RouteDecision = 'ACCEPTED' | 'REJECTED';

export interface NormalizedRouteStep {
  id: string;
  stepOrder: number;
  userId: string;
  user: User;
  toUserId?: string;
  toUser?: User;
  givesItemId: string;
  givesItem: Item;
  receivesItemId: string;
  receivesItem?: Item;
  acceptance: StepAcceptanceStatus;
  respondedAt?: string;
  deliveryConfirmed: boolean;
}

declare module '@/types' {
  interface SwapRoute {
    code?: string;
    initiatorId?: string;
    objectiveText?: string;
    matchScore?: number;
    status?: RouteLifecycleStatus;
    aiExplanation?: string;
    steps?: NormalizedRouteStep[];
    expiresAt?: string;
    createdAt?: string;
  }
}

export interface SearchRoutesPayload {
  offeredItemId?: string;
  objectiveText: string;
  desiredCategory?: string;
  maxSteps?: number;
  valueTolerancePct?: number;
  /** Language for AI route explanations; defaults to the user's app locale. */
  locale?: LocalePreference;
  /** Where to look for participants, relative to the user's registered municipality. */
  scope?: 'nearby' | 'department' | 'country';
  radiusKm?: number;
}

export interface ProposeRouteStepInput {
  stepOrder: number;
  userId: string;
  givesItemId: string;
  receivesItemId: string;
}

export interface ProposeRoutePayload {
  routeId?: string;
  code?: string;
  offeredItemId?: string;
  targetItemId?: string;
  objectiveText?: string;
  matchScore?: number;
  aiExplanation?: string;
  co2SavedKg?: number;
  steps?: ProposeRouteStepInput[];
}

export interface SwapRouteStepDto {
  id?: string;
  routeId?: string;
  stepOrder?: number;
  userId?: string;
  fromUserId?: string;
  toUserId?: string;
  user?: Partial<RawUserDto> & { id?: string; name?: string };
  fromUser?: Partial<RawUserDto> & { id?: string; name?: string };
  toUser?: Partial<RawUserDto> & { id?: string; name?: string };
  givesItemId?: string;
  fromItemId?: string;
  givesItem?: Partial<RawItemDto> & { id?: string; name?: string };
  fromItem?: Partial<RawItemDto> & { id?: string; name?: string };
  receivesItemId?: string;
  toItemId?: string;
  receivesItem?: Partial<RawItemDto> & { id?: string; name?: string };
  toItem?: Partial<RawItemDto> & { id?: string; name?: string };
  acceptance?: StepAcceptanceStatus | 'REJECTED' | string;
  status?: StepAcceptanceStatus | 'REJECTED' | string;
  respondedAt?: string | Date | null;
  deliveryConfirmed?: boolean;
}

export interface SwapRouteDto {
  id?: string;
  routeId?: string;
  code?: string;
  title?: string;
  initiatorId?: string;
  objectiveText?: string;
  matchScore?: number;
  status?: RouteLifecycleStatus;
  aiExplanation?: string | null;
  co2SavedKg?: number;
  stepsCount?: number;
  offeredItemId?: string;
  targetItemId?: string;
  isLoop?: boolean;
  steps?: SwapRouteStepDto[];
  participants?: Array<Partial<RawUserDto> & { id: string; name?: string }>;
  chainItems?: Array<Partial<RawItemDto> & { id: string; name?: string }>;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
}

interface RoutesListEnvelope {
  data?: SwapRouteDto[];
  routes?: SwapRouteDto[];
}

interface SingleRouteEnvelope {
  data?: SwapRouteDto;
  route?: SwapRouteDto;
}

/** Percentage to show for a route score, or null when the API sent no usable score. */
export const formatMatchScore = (score?: number): number | null => {
  if (typeof score !== 'number' || Number.isNaN(score) || score <= 0) {
    return null;
  }
  if (score <= 1) {
    return Math.round(score * 100);
  }
  return Math.min(100, Math.round(score));
};

const normalizeStepAcceptance = (raw?: string | null): StepAcceptanceStatus => {
  if (!raw) return 'PENDING';
  const upper = raw.trim().toUpperCase();
  if (upper === 'ACCEPTED' || upper === 'CONFIRMED') {
    return 'ACCEPTED';
  }
  if (upper === 'DECLINED' || upper === 'REJECTED' || upper === 'CANCELLED') {
    return 'DECLINED';
  }
  return 'PENDING';
};

const resolveStepUser = (
  rawUser: (Partial<RawUserDto> & { id?: string; name?: string }) | undefined,
  fallbackId: string | undefined,
): User => {
  const id = rawUser?.id || fallbackId;
  if (!id) {
    throw new Error('Route step is missing its participant');
  }
  return normalizeUser({ ...rawUser, id, name: rawUser?.name ?? '', email: rawUser?.email ?? '' });
};

const resolveStepItem = (
  rawItem: (Partial<RawItemDto> & { id?: string; name?: string }) | undefined,
  fallbackId: string | undefined,
  ownerId: string,
): Item => {
  const id = rawItem?.id || fallbackId;
  if (!id) {
    throw new Error('Route step is missing its item');
  }
  return normalizeItem({
    ...rawItem,
    id,
    name: rawItem?.name ?? '',
    category: rawItem?.category ?? '',
    condition: rawItem?.condition ?? '',
    ownerId: rawItem?.ownerId || ownerId,
  });
};

export const mapApiRouteToUiRoute = (apiRoute: SwapRouteDto): SwapRoute => {
  const rawSteps = Array.isArray(apiRoute.steps) ? [...apiRoute.steps] : [];
  rawSteps.sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));

  const normalizedSteps: NormalizedRouteStep[] = rawSteps.map((rawStep, idx) => {
    const rawUserObj = rawStep.user || rawStep.fromUser;
    const stepUserId =
      rawStep.userId ||
      rawStep.fromUserId ||
      rawUserObj?.id ||
      rawStep.givesItem?.ownerId ||
      rawStep.fromItem?.ownerId;

    const user = resolveStepUser(rawUserObj, stepUserId);

    const rawGivesObj = rawStep.givesItem || rawStep.fromItem;
    const givesItemId =
      rawStep.givesItemId || rawStep.fromItemId || rawGivesObj?.id;
    const givesItem = resolveStepItem(rawGivesObj, givesItemId, user.id);

    const rawReceivesObj = rawStep.receivesItem || rawStep.toItem;
    const receivesItemId =
      rawStep.receivesItemId || rawStep.toItemId || rawReceivesObj?.id || '';
    const receivesItem =
      rawReceivesObj || receivesItemId
        ? resolveStepItem(rawReceivesObj, receivesItemId, '')
        : undefined;

    const toUser =
      rawStep.toUser || rawStep.toUserId
        ? resolveStepUser(rawStep.toUser, rawStep.toUserId)
        : undefined;

    const respondedAt =
      typeof rawStep.respondedAt === 'string'
        ? rawStep.respondedAt
        : rawStep.respondedAt instanceof Date
          ? rawStep.respondedAt.toISOString()
          : undefined;

    return {
      id: rawStep.id || `${apiRoute.id ?? apiRoute.code ?? 'route'}-step-${idx + 1}`,
      stepOrder: typeof rawStep.stepOrder === 'number' ? rawStep.stepOrder : idx + 1,
      userId: user.id,
      user,
      toUserId: toUser?.id,
      toUser,
      givesItemId: givesItem.id,
      givesItem,
      receivesItemId: receivesItem?.id || receivesItemId || givesItem.id,
      receivesItem,
      acceptance: normalizeStepAcceptance(rawStep.acceptance || rawStep.status),
      respondedAt,
      deliveryConfirmed: Boolean(rawStep.deliveryConfirmed),
    };
  });

  // Determine ordered steps for UI chain rendering so chainItems[0] = offered item and chainItems[last] = target item
  let orderedStepsForChain = [...normalizedSteps];
  if (
    orderedStepsForChain.length > 2 &&
    orderedStepsForChain[0].receivesItemId &&
    orderedStepsForChain[0].receivesItemId === orderedStepsForChain[1].givesItemId &&
    orderedStepsForChain[0].receivesItemId !==
      orderedStepsForChain[orderedStepsForChain.length - 1].givesItemId
  ) {
    orderedStepsForChain = [
      orderedStepsForChain[0],
      ...orderedStepsForChain.slice(1).reverse(),
    ];
  }

  let participants: User[];
  if (Array.isArray(apiRoute.participants) && apiRoute.participants.length > 0) {
    participants = apiRoute.participants.map((p) => resolveStepUser(p, p.id));
  } else if (orderedStepsForChain.length > 0) {
    participants = orderedStepsForChain.map((s) => s.user);
    if (orderedStepsForChain.length === 1 && orderedStepsForChain[0].toUser) {
      participants.push(orderedStepsForChain[0].toUser);
    }
  } else {
    participants = [];
  }

  let chainItems: Item[];
  if (Array.isArray(apiRoute.chainItems) && apiRoute.chainItems.length > 0) {
    chainItems = apiRoute.chainItems.map((item, idx) =>
      resolveStepItem(item, item.id, participants[idx]?.id || ''),
    );
  } else if (orderedStepsForChain.length > 0) {
    chainItems = orderedStepsForChain.map((s) => s.givesItem);
    if (
      orderedStepsForChain.length === 1 &&
      orderedStepsForChain[0].receivesItem &&
      orderedStepsForChain[0].receivesItem.id !== orderedStepsForChain[0].givesItem.id
    ) {
      chainItems.push(orderedStepsForChain[0].receivesItem);
    }
  } else {
    chainItems = [];
  }

  const stepsCount =
    typeof apiRoute.stepsCount === 'number' && apiRoute.stepsCount > 0
      ? apiRoute.stepsCount
      : normalizedSteps.length > 0
        ? normalizedSteps.length
        : Math.max(1, chainItems.length - 1);

  const co2SavedKg =
    typeof apiRoute.co2SavedKg === 'number' && apiRoute.co2SavedKg > 0
      ? Number(apiRoute.co2SavedKg.toFixed(1))
      : 0;

  const offeredItemId =
    apiRoute.offeredItemId ||
    normalizedSteps[0]?.givesItemId ||
    chainItems[0]?.id ||
    '';

  const targetItemId =
    apiRoute.targetItemId ||
    (normalizedSteps[0]?.receivesItemId &&
    normalizedSteps[0].receivesItemId !== normalizedSteps[0].givesItemId
      ? normalizedSteps[0].receivesItemId
      : undefined) ||
    chainItems[chainItems.length - 1]?.id ||
    '';

  const routeId = apiRoute.id || apiRoute.routeId || apiRoute.code;
  if (!routeId) {
    throw new Error('Route response has no id');
  }
  const code = apiRoute.code || routeId;

  const aiExplanation =
    typeof apiRoute.aiExplanation === 'string' && apiRoute.aiExplanation.trim().length > 0
      ? apiRoute.aiExplanation.trim()
      : undefined;

  const matchScore =
    typeof apiRoute.matchScore === 'number' && !Number.isNaN(apiRoute.matchScore)
      ? apiRoute.matchScore
      : undefined;

  const expiresAt =
    typeof apiRoute.expiresAt === 'string'
      ? apiRoute.expiresAt
      : apiRoute.expiresAt instanceof Date
        ? apiRoute.expiresAt.toISOString()
        : undefined;

  const createdAt =
    typeof apiRoute.createdAt === 'string'
      ? apiRoute.createdAt
      : apiRoute.createdAt instanceof Date
        ? apiRoute.createdAt.toISOString()
        : undefined;

  return {
    id: routeId,
    code,
    title: apiRoute.title || chainItems.map((item) => item.name).join(' → '),
    stepsCount,
    targetItemId,
    offeredItemId,
    participants,
    chainItems,
    co2SavedKg,
    isLoop: typeof apiRoute.isLoop === 'boolean' ? apiRoute.isLoop : normalizedSteps.length > 1,
    initiatorId: apiRoute.initiatorId || participants[0]?.id,
    objectiveText: apiRoute.objectiveText || chainItems[chainItems.length - 1]?.name,
    matchScore,
    status: apiRoute.status || 'SUGGESTED',
    aiExplanation,
    steps: normalizedSteps,
    expiresAt,
    createdAt,
  };
};

export const mapRouteToProposal = (
  routeOrDto: SwapRoute | SwapRouteDto,
  currentUserId: string,
): Proposal => {
  const route =
    'chainItems' in routeOrDto &&
    Array.isArray(routeOrDto.chainItems) &&
    'participants' in routeOrDto &&
    Array.isArray(routeOrDto.participants) &&
    typeof routeOrDto.stepsCount === 'number' &&
    typeof routeOrDto.isLoop === 'boolean'
      ? (routeOrDto as SwapRoute)
      : mapApiRouteToUiRoute(routeOrDto);

  let status: ProposalStatus = 'pending';
  const upperStatus = (route.status || 'SUGGESTED').toUpperCase();
  const hasDeclinedStep = route.steps?.some((s) => s.acceptance === 'DECLINED');
  const allStepsAccepted =
    route.steps && route.steps.length > 0 && route.steps.every((s) => s.acceptance === 'ACCEPTED');

  if (upperStatus === 'COMPLETED') {
    status = 'completed';
  } else if (upperStatus === 'CANCELLED' || upperStatus === 'EXPIRED' || hasDeclinedStep) {
    status = 'declined';
  } else if (upperStatus === 'CONFIRMED' || allStepsAccepted) {
    status = 'accepted';
  } else {
    status = 'pending';
  }

  return {
    id: route.id,
    targetItemId: route.targetItemId,
    offeredItemId: route.offeredItemId,
    proposerUserId: route.initiatorId || route.participants[0]?.id || currentUserId,
    recipientUserId:
      route.participants[1]?.id ||
      route.participants[route.participants.length - 1]?.id ||
      '',
    status,
    createdAt: route.createdAt ?? '',
  };
};

const extractRoutesArray = (raw: SwapRouteDto[] | RoutesListEnvelope): SwapRoute[] => {
  if (Array.isArray(raw)) {
    return raw.map(mapApiRouteToUiRoute);
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.routes)) {
      return raw.routes.map(mapApiRouteToUiRoute);
    }
    if (Array.isArray(raw.data)) {
      return raw.data.map(mapApiRouteToUiRoute);
    }
  }
  return [];
};

const extractSingleRoute = (raw: SwapRouteDto | SingleRouteEnvelope): SwapRoute => {
  if (raw && typeof raw === 'object') {
    if ('route' in raw && raw.route && typeof raw.route === 'object') {
      return mapApiRouteToUiRoute(raw.route);
    }
    if ('data' in raw && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
      return mapApiRouteToUiRoute(raw.data);
    }
  }
  return mapApiRouteToUiRoute((raw as SwapRouteDto) ?? {});
};

export const routesService = {
  async searchRoutes(payload: SearchRoutesPayload): Promise<SwapRoute[]> {
    const response = await apiClient.post<SwapRouteDto[] | RoutesListEnvelope>(
      '/routes/search',
      { ...payload, locale: payload.locale ?? preferencesStorage.getLocale() },
    );
    return extractRoutesArray(response);
  },

  async proposeRoute(payload: ProposeRoutePayload): Promise<SwapRoute> {
    const response = await apiClient.post<SwapRouteDto | SingleRouteEnvelope>(
      '/routes/propose',
      payload,
    );
    return extractSingleRoute(response);
  },

  async listMyRoutes(): Promise<SwapRoute[]> {
    const response = await apiClient.get<SwapRouteDto[] | RoutesListEnvelope>('/routes');
    return extractRoutesArray(response);
  },

  async getRouteById(id: string): Promise<SwapRoute> {
    const response = await apiClient.get<SwapRouteDto | SingleRouteEnvelope>(`/routes/${id}`);
    return extractSingleRoute(response);
  },

  async respondToRoute(
    routeId: string,
    decision: RouteDecision,
    comment?: string,
  ): Promise<SwapRoute> {
    const body = comment !== undefined ? { decision, comment } : { decision };
    const response = await apiClient.post<SwapRouteDto | SingleRouteEnvelope>(
      `/routes/${routeId}/respond`,
      body,
    );
    return extractSingleRoute(response);
  },

  async cancelRoute(routeId: string): Promise<SwapRoute> {
    const response = await apiClient.post<SwapRouteDto | SingleRouteEnvelope>(
      `/routes/${routeId}/cancel`,
    );
    return extractSingleRoute(response);
  },

  async completeRoute(routeId: string): Promise<SwapRoute> {
    const response = await apiClient.post<SwapRouteDto | SingleRouteEnvelope>(
      `/routes/${routeId}/complete`,
    );
    return extractSingleRoute(response);
  },
};

export default routesService;
