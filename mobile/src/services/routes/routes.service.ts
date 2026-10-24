import { apiClient } from '@/services/http/apiClient';
import { normalizeUser, type RawUserDto } from '@/services/auth/auth.service';
import { normalizeItem, type RawItemDto } from '@/services/items/items.service';
import { findRoutes as findLocalRoutes } from '@/lib/routeFinder';
import { mockItems, mockSwapRoute, mockUsers } from '@/data/mockData';
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

export const formatMatchScore = (score?: number): number => {
  if (typeof score !== 'number' || Number.isNaN(score) || score <= 0) {
    return 96;
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
  stepIndex: number,
): User => {
  if (rawUser && (rawUser.id || rawUser.name)) {
    const mockMatch = rawUser.id ? mockUsers.find((u) => u.id === rawUser.id) : undefined;
    return normalizeUser({
      id: rawUser.id || mockMatch?.id || `user-step-${stepIndex}`,
      name: rawUser.name || mockMatch?.name || `Usuario ${stepIndex + 1}`,
      email: rawUser.email || mockMatch?.email || `user${stepIndex + 1}@smartswap.io`,
      avatarUrl: rawUser.avatarUrl || mockMatch?.avatarUrl,
      location: rawUser.location || mockMatch?.location || 'Madrid, España',
      rating: typeof rawUser.rating === 'number' ? rawUser.rating : mockMatch?.rating ?? 4.9,
      verified: typeof rawUser.verified === 'boolean' ? rawUser.verified : mockMatch?.verified ?? true,
      co2SavedKg:
        typeof rawUser.co2SavedKg === 'number' ? rawUser.co2SavedKg : mockMatch?.co2SavedKg ?? 18.0,
      initials: rawUser.initials,
    });
  }

  if (fallbackId) {
    const foundMock = mockUsers.find((u) => u.id === fallbackId);
    if (foundMock) {
      return foundMock;
    }
  }

  const defaultMock = mockUsers[stepIndex % mockUsers.length] || mockUsers[0];
  return {
    ...defaultMock,
    id: fallbackId || defaultMock.id,
  };
};

const resolveStepItem = (
  rawItem: (Partial<RawItemDto> & { id?: string; name?: string }) | undefined,
  fallbackId: string | undefined,
  ownerId: string,
  stepIndex: number,
): Item => {
  if (rawItem && (rawItem.id || rawItem.name)) {
    const mockMatch = rawItem.id ? mockItems.find((i) => i.id === rawItem.id) : undefined;
    return normalizeItem({
      id: rawItem.id || mockMatch?.id || `item-step-${stepIndex}`,
      name: rawItem.name || mockMatch?.name || `Artículo #${stepIndex + 1}`,
      category: rawItem.category || mockMatch?.category || 'Tecnología',
      condition: rawItem.condition || mockMatch?.condition || 'LIKE_NEW',
      ownerId: rawItem.ownerId || ownerId || mockMatch?.ownerId || `user-step-${stepIndex}`,
      imageUrl: rawItem.imageUrl || mockMatch?.imageUrl,
      images: rawItem.images || (mockMatch?.imageUrl ? [mockMatch.imageUrl] : undefined),
      wants: rawItem.wants || mockMatch?.wants || [],
      description: rawItem.description ?? mockMatch?.description,
      estimatedValue:
        typeof rawItem.estimatedValue === 'number'
          ? rawItem.estimatedValue
          : mockMatch?.estimatedValue ?? 450,
      location: rawItem.location ?? mockMatch?.location,
      status: rawItem.status ?? 'AVAILABLE',
      aiTags: rawItem.aiTags ?? mockMatch?.aiTags,
      owner: rawItem.owner,
    });
  }

  if (fallbackId) {
    const foundMock = mockItems.find((i) => i.id === fallbackId);
    if (foundMock) {
      return foundMock;
    }
  }

  const defaultMock = mockItems[stepIndex % mockItems.length] || mockItems[0];
  return {
    ...defaultMock,
    id: fallbackId || defaultMock.id,
    ownerId: ownerId || defaultMock.ownerId,
  };
};

const buildDefaultAiExplanation = (
  chainItems: Item[],
  stepsCount: number,
  co2SavedKg: number,
): string => {
  const firstItem = chainItems[0];
  const lastItem = chainItems[chainItems.length - 1];
  const firstValue = firstItem?.estimatedValue ?? 750;
  const lastValue = lastItem?.estimatedValue ?? 780;

  return `Ciclo circular equilibrado de ${stepsCount} ${
    stepsCount === 1 ? 'paso' : 'pasos'
  }: el valor estimado entre ${firstItem?.name || 'tu artículo'} ($${firstValue} USD) y ${
    lastItem?.name || 'el objetivo deseado'
  } ($${lastValue} USD) se encuentra dentro del margen de equidad sin requerir dinero adicional, evitando ${co2SavedKg} kg de CO₂.`;
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
      rawStep.fromItem?.ownerId ||
      `user-step-${idx}`;

    const user = resolveStepUser(rawUserObj, stepUserId, idx);

    const rawGivesObj = rawStep.givesItem || rawStep.fromItem;
    const givesItemId =
      rawStep.givesItemId || rawStep.fromItemId || rawGivesObj?.id || `item-step-${idx}`;
    const givesItem = resolveStepItem(rawGivesObj, givesItemId, user.id, idx);

    const rawReceivesObj = rawStep.receivesItem || rawStep.toItem;
    const receivesItemId =
      rawStep.receivesItemId || rawStep.toItemId || rawReceivesObj?.id || '';
    const receivesItem =
      rawReceivesObj || receivesItemId
        ? resolveStepItem(rawReceivesObj, receivesItemId, '', (idx + 1) % Math.max(1, rawSteps.length))
        : undefined;

    const toUser =
      rawStep.toUser || rawStep.toUserId
        ? resolveStepUser(rawStep.toUser, rawStep.toUserId, idx + 1)
        : undefined;

    const respondedAt =
      typeof rawStep.respondedAt === 'string'
        ? rawStep.respondedAt
        : rawStep.respondedAt instanceof Date
          ? rawStep.respondedAt.toISOString()
          : undefined;

    return {
      id: rawStep.id || `step-${apiRoute.id || 'route'}-${idx + 1}`,
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
    participants = apiRoute.participants.map((p, idx) => resolveStepUser(p, p.id, idx));
  } else if (orderedStepsForChain.length > 0) {
    participants = orderedStepsForChain.map((s) => s.user);
    if (orderedStepsForChain.length === 1 && orderedStepsForChain[0].toUser) {
      participants.push(orderedStepsForChain[0].toUser);
    }
  } else {
    participants = [...mockSwapRoute.participants];
  }

  let chainItems: Item[];
  if (Array.isArray(apiRoute.chainItems) && apiRoute.chainItems.length > 0) {
    chainItems = apiRoute.chainItems.map((item, idx) =>
      resolveStepItem(item, item.id, participants[idx]?.id || '', idx),
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
    chainItems = [...mockSwapRoute.chainItems];
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
      : Number((Math.max(2, participants.length) * 10.5).toFixed(1));

  const offeredItemId =
    apiRoute.offeredItemId ||
    normalizedSteps[0]?.givesItemId ||
    chainItems[0]?.id ||
    mockSwapRoute.offeredItemId;

  const targetItemId =
    apiRoute.targetItemId ||
    (normalizedSteps[0]?.receivesItemId &&
    normalizedSteps[0].receivesItemId !== normalizedSteps[0].givesItemId
      ? normalizedSteps[0].receivesItemId
      : undefined) ||
    chainItems[chainItems.length - 1]?.id ||
    mockSwapRoute.targetItemId;

  const routeId = apiRoute.id || apiRoute.routeId || apiRoute.code || mockSwapRoute.id;
  const code =
    apiRoute.code ||
    (routeId.startsWith('SR-') ? routeId : `SR-${routeId.slice(0, 4).toUpperCase()}`);

  const aiExplanation =
    typeof apiRoute.aiExplanation === 'string' && apiRoute.aiExplanation.trim().length > 0
      ? apiRoute.aiExplanation.trim()
      : buildDefaultAiExplanation(chainItems, stepsCount, co2SavedKg);

  const matchScore =
    typeof apiRoute.matchScore === 'number' && !Number.isNaN(apiRoute.matchScore)
      ? apiRoute.matchScore
      : 96;

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
    title: apiRoute.title || 'Ruta Inteligente Multiusuario',
    stepsCount,
    targetItemId,
    offeredItemId,
    participants,
    chainItems,
    co2SavedKg,
    isLoop: typeof apiRoute.isLoop === 'boolean' ? apiRoute.isLoop : true,
    initiatorId: apiRoute.initiatorId || participants[0]?.id || 'user-alex',
    objectiveText:
      apiRoute.objectiveText ||
      chainItems[chainItems.length - 1]?.name ||
      'Cámara Fujifilm X-T30 II',
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
  currentUserId = 'user-alex',
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
      'user-carlos',
    status,
    createdAt: route.createdAt || new Date().toISOString(),
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

const resolveFallbackTargetItemId = (objectiveText: string, desiredCategory?: string): string => {
  const query = (objectiveText || '').trim().toLowerCase();

  // Direct mock item ID match
  const exactIdMatch = mockItems.find((i) => i.id.toLowerCase() === query);
  if (exactIdMatch) {
    return exactIdMatch.id;
  }

  // Keyword match against mock items
  if (query.includes('fujifilm') || query.includes('cámara') || query.includes('camara')) {
    return 'item-camera';
  }
  if (query.includes('ipad') || query.includes('tablet')) {
    return 'item-ipad';
  }
  if (query.includes('ps5') || query.includes('switch') || query.includes('consola')) {
    return 'item-switch';
  }
  if (query.includes('sony') || query.includes('xm5') || query.includes('audífonos') || query.includes('auriculares')) {
    return 'item-headphones';
  }

  const nameMatch = mockItems.find(
    (i) =>
      i.name.toLowerCase().includes(query) ||
      (desiredCategory && i.category.toLowerCase() === desiredCategory.toLowerCase()),
  );
  return nameMatch?.id || 'item-camera';
};

export const buildOfflineFallbackRoutes = (payload: SearchRoutesPayload): SwapRoute[] => {
  const haveItemId =
    payload.offeredItemId && mockItems.some((i) => i.id === payload.offeredItemId)
      ? payload.offeredItemId
      : 'item-bike';
  const wantItemId = resolveFallbackTargetItemId(payload.objectiveText, payload.desiredCategory);

  const localRoutes = findLocalRoutes(mockItems, mockUsers, haveItemId, wantItemId, {
    maxSwaps: payload.maxSteps ?? 5,
    maxRoutes: 10,
  });

  return localRoutes.map((route, index) => {
    const steps: NormalizedRouteStep[] = route.chainItems.map((item, stepIdx) => {
      const user = route.participants[stepIdx] || mockUsers[0];
      const nextUser = route.participants[(stepIdx + 1) % route.participants.length];
      const prevItem =
        stepIdx === 0
          ? route.chainItems[route.chainItems.length - 1]
          : route.chainItems[stepIdx - 1];

      return {
        id: `local-step-${route.id}-${stepIdx + 1}`,
        stepOrder: stepIdx + 1,
        userId: user.id,
        user,
        toUserId: nextUser?.id,
        toUser: nextUser,
        givesItemId: item.id,
        givesItem: item,
        receivesItemId: prevItem.id,
        receivesItem: prevItem,
        acceptance: 'PENDING',
        deliveryConfirmed: false,
      };
    });

    const matchScore = Math.max(82, 98 - index * 4);
    const code = `SR-${8492 + index}`;

    return {
      ...route,
      code,
      initiatorId: route.participants[0]?.id || 'user-alex',
      objectiveText: payload.objectiveText || 'Cámara Fujifilm X-T30 II',
      matchScore,
      status: 'SUGGESTED',
      aiExplanation: buildDefaultAiExplanation(
        route.chainItems,
        route.stepsCount,
        route.co2SavedKg,
      ),
      steps,
    };
  });
};

export const routesService = {
  async searchRoutes(payload: SearchRoutesPayload): Promise<SwapRoute[]> {
    try {
      const response = await apiClient.post<SwapRouteDto[] | RoutesListEnvelope>(
        '/routes/search',
        payload,
      );
      return extractRoutesArray(response);
    } catch {
      return buildOfflineFallbackRoutes(payload);
    }
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

  async completeRoute(routeId: string): Promise<SwapRoute> {
    const response = await apiClient.post<SwapRouteDto | SingleRouteEnvelope>(
      `/routes/${routeId}/complete`,
    );
    return extractSingleRoute(response);
  },
};

export default routesService;
