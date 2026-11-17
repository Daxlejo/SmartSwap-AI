import type { Item, SwapRoute, User } from '@/types';
import type { NormalizedRouteStep } from '@/services/routes/routes.service';

/** Fair-value band, in percent, the engine allows between consecutive items. */
export const VALUE_TOLERANCE_PCT = 25;

/** A circular swap needs a third person: 1-to-1 swaps are proposed directly. */
export const CIRCULAR_MIN_STEPS = 3;
export const CIRCULAR_MAX_STEPS = 4;

/** Statuses that keep an item on offer (the API answers ACTIVE; older payloads AVAILABLE). */
const OFFERABLE_STATUSES = ['ACTIVE', 'AVAILABLE'];

/**
 * Whether an owned item is still published and free to offer. Items reserved by a
 * proposal (PENDING_SWAP), already traded (SWAPPED) or paused cannot enter a route.
 */
export const isOfferableItem = (item: { status?: string }): boolean =>
  item.status === undefined || OFFERABLE_STATUSES.includes(item.status.toUpperCase());

/** What the screens know about the user's own published (offerable) items. */
export interface InventorySnapshot {
  /** True once the user's items loaded successfully. */
  loaded: boolean;
  /** Owned items that pass {@link isOfferableItem}. */
  publishedCount: number;
}

// ---------------------------------------------------------------------------
// New swap: three steps whose choices live in the URL, so Android's back button
// walks back through the steps and a step reopens with what was chosen.
// ---------------------------------------------------------------------------

export type SwapMode = 'direct' | 'circular';
export type SwapDraftStep = 1 | 2 | 3;

export interface SwapDraft {
  step: SwapDraftStep;
  /** The user's item they offer. */
  offeredItemId?: string;
  /** The item they want to receive. */
  wantedItemId?: string;
  /** True when the flow started on an item's detail: the wanted item cannot change. */
  wantFixed: boolean;
  mode?: SwapMode;
}

const STEPS: readonly SwapDraftStep[] = [1, 2, 3];

/** Reads the draft from the URL of the New swap screen; unknown values fall back to step 1. */
export const parseSwapDraft = (params: URLSearchParams): SwapDraft => {
  const step = Number(params.get('step'));
  const mode = params.get('mode');
  return {
    step: STEPS.includes(step as SwapDraftStep) ? (step as SwapDraftStep) : 1,
    offeredItemId: params.get('have') || undefined,
    wantedItemId: params.get('want') || undefined,
    wantFixed: params.get('fixed') === '1' && Boolean(params.get('want')),
    mode: mode === 'direct' || mode === 'circular' ? mode : undefined,
  };
};

/** URL of the New swap screen for a draft (the inverse of {@link parseSwapDraft}). */
export const swapDraftPath = (draft: SwapDraft): string => {
  const params = new URLSearchParams({ step: String(draft.step) });
  if (draft.offeredItemId) params.set('have', draft.offeredItemId);
  if (draft.wantedItemId) params.set('want', draft.wantedItemId);
  if (draft.wantFixed && draft.wantedItemId) params.set('fixed', '1');
  if (draft.mode) params.set('mode', draft.mode);
  return `/swap/configure?${params.toString()}`;
};

/** Entry from an item's detail: that item is what the user receives, fixed. */
export const swapDraftForItem = (wantedItemId: string): string =>
  swapDraftPath({ step: 1, wantedItemId, wantFixed: true });

/**
 * The step a draft may actually show: a later step needs the earlier choices
 * (opening step 3 without an offered item goes back to step 1).
 */
export const reachableStep = (draft: SwapDraft): SwapDraftStep => {
  if (!draft.offeredItemId) return 1;
  if (draft.step === 3 && !draft.wantedItemId) return 2;
  return draft.step;
};

/** Route state the Searching and Results screens read back. */
export interface SwapSearchState {
  offeredItemId: string;
  wantItemId: string;
  objectiveText: string;
  desiredCategory?: string;
  minSteps: number;
  maxSteps: number;
  valueTolerancePct: number;
}

export interface SwapSearchNavigation {
  path: string;
  state: SwapSearchState;
}

/** Search for rings of 3 or 4 people in which the user receives exactly `wanted`. */
export const buildCircularSearch = (
  offered: Pick<Item, 'id'>,
  wanted: Pick<Item, 'id' | 'name' | 'category'>,
): SwapSearchNavigation => {
  const objectiveText = wanted.name.trim();
  const params = new URLSearchParams({
    have: offered.id,
    want: wanted.id,
    q: objectiveText,
    minSteps: String(CIRCULAR_MIN_STEPS),
    maxSteps: String(CIRCULAR_MAX_STEPS),
    tolerance: String(VALUE_TOLERANCE_PCT),
  });
  return {
    path: `/swap/searching?${params.toString()}`,
    state: {
      offeredItemId: offered.id,
      wantItemId: wanted.id,
      objectiveText,
      desiredCategory: wanted.category,
      minSteps: CIRCULAR_MIN_STEPS,
      maxSteps: CIRCULAR_MAX_STEPS,
      valueTolerancePct: VALUE_TOLERANCE_PCT,
    },
  };
};

/** Catalog items the user can ask for that match what they typed (name, category or description). */
export const findWantedCandidates = (
  catalog: readonly Item[],
  query: string,
  viewerId: string | undefined,
  limit = 8,
): Item[] => {
  const needle = normalize(query);
  if (needle.length < 2) return [];
  return catalog
    .filter((item) => item.ownerId !== viewerId && isOfferableItem(item))
    .filter((item) =>
      [item.name, item.category, item.description ?? ''].some((text) =>
        normalize(text).includes(needle),
      ),
    )
    .slice(0, limit);
};

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// ---------------------------------------------------------------------------
// Direct (1-to-1) proposal
// ---------------------------------------------------------------------------

/** What Confirm receives for a direct proposal: both items, with the wanted item's owner. */
export interface DirectProposalDraft {
  offeredItem: Item;
  wantedItem: Item;
}

/** The owner of an item as a user, when the item came with its owner. */
export const itemOwnerAsUser = (item: Item): User | undefined =>
  item.owner
    ? {
        id: item.owner.id,
        name: item.owner.name,
        email: item.owner.email ?? '',
        avatarUrl: item.owner.avatarUrl,
        rating: item.owner.rating,
        location: item.owner.location,
        verified: item.owner.verified ?? false,
        co2SavedKg: item.owner.co2SavedKg ?? 0,
      }
    : undefined;

/**
 * The 2-person ring a direct proposal will create, to preview it before sending:
 * the viewer gives their item (already accepted by proposing) and the owner gives
 * theirs (pending). Returns `null` without the owner's name.
 */
export const buildDirectPreviewRoute = (
  draft: DirectProposalDraft,
  viewer: User,
): SwapRoute | null => {
  const owner = itemOwnerAsUser(draft.wantedItem);
  if (!owner?.name) return null;
  const { offeredItem, wantedItem } = draft;
  const steps: NormalizedRouteStep[] = [
    {
      id: 'direct-preview-0',
      stepOrder: 0,
      userId: viewer.id,
      user: viewer,
      toUserId: owner.id,
      toUser: owner,
      givesItemId: offeredItem.id,
      givesItem: offeredItem,
      receivesItemId: wantedItem.id,
      receivesItem: wantedItem,
      acceptance: 'ACCEPTED',
      deliveryConfirmed: false,
    },
    {
      id: 'direct-preview-1',
      stepOrder: 1,
      userId: owner.id,
      user: owner,
      toUserId: viewer.id,
      toUser: viewer,
      givesItemId: wantedItem.id,
      givesItem: wantedItem,
      receivesItemId: offeredItem.id,
      receivesItem: offeredItem,
      acceptance: 'PENDING',
      deliveryConfirmed: false,
    },
  ];
  return {
    id: 'direct-preview',
    title: wantedItem.name,
    stepsCount: 2,
    offeredItemId: offeredItem.id,
    targetItemId: wantedItem.id,
    participants: [viewer, owner],
    chainItems: [offeredItem, wantedItem],
    co2SavedKg: 0,
    isLoop: true,
    objectiveText: wantedItem.name,
    steps,
  };
};

/**
 * Most likely reason a finished search returned no routes. `unknown` means the
 * inventory has not loaded, so neither the items nor the network can be blamed.
 */
export type NoRoutesReason = 'noItems' | 'noCycles' | 'unknown';

/**
 * With nothing published there is nothing to offer, so the engine cannot close
 * a cycle; otherwise nobody in the network currently closes one for this item.
 */
export const getNoRoutesReason = (inventory: InventorySnapshot): NoRoutesReason => {
  if (!inventory.loaded) return 'unknown';
  return inventory.publishedCount === 0 ? 'noItems' : 'noCycles';
};
