/**
 * Why the route search cannot start yet; `null` means the engine can be called.
 * `inventoryPending` covers an inventory that is still loading or failed to load:
 * an empty list then proves nothing, so the user is not told to publish.
 */
export type SwapSearchBlocker = 'inventoryPending' | 'noItems' | 'noWant' | null;

/** Shortest objective text the engine accepts. */
export const MIN_OBJECTIVE_LENGTH = 2;

/** Fair-value band, in percent, the engine allows between consecutive items. */
export const VALUE_TOLERANCE_PCT = 25;

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

/**
 * Decides whether Configure swap may call the route engine. The user needs a
 * published item to offer and a chosen objective; otherwise the search (and the
 * AI explanation that follows it) must not run.
 */
export const getSwapSearchBlocker = (
  inventory: InventorySnapshot,
  objectiveText: string,
): SwapSearchBlocker => {
  if (inventory.publishedCount === 0) return inventory.loaded ? 'noItems' : 'inventoryPending';
  if (objectiveText.trim().length < MIN_OBJECTIVE_LENGTH) return 'noWant';
  return null;
};

export interface SwapSearchInput {
  blocker: SwapSearchBlocker;
  offeredItemId: string | undefined;
  objectiveText: string;
  mode: 'circular' | 'direct';
  /** Catalog item the objective points at, when one matched. */
  target?: { id: string; category: string };
}

/** Route state the Searching and Results screens read back. */
export interface SwapSearchState {
  offeredItemId: string;
  wantItemId: string;
  objectiveText: string;
  desiredCategory?: string;
  maxSteps: number;
  valueTolerancePct: number;
}

export interface SwapSearchNavigation {
  path: string;
  state: SwapSearchState;
}

/**
 * Builds the navigation to the Searching screen, which is what calls the engine.
 * Returns `null` while the search is blocked, so a blocked tap never reaches it.
 */
export const buildSwapSearchNavigation = (input: SwapSearchInput): SwapSearchNavigation | null => {
  if (input.blocker !== null || !input.offeredItemId) return null;
  const objectiveText = input.objectiveText.trim();
  const maxSteps = input.mode === 'direct' ? 2 : 4;
  const wantItemId = input.target?.id ?? '';
  const params = new URLSearchParams({
    have: input.offeredItemId,
    q: objectiveText,
    maxSteps: String(maxSteps),
    tolerance: String(VALUE_TOLERANCE_PCT),
  });
  if (wantItemId) params.set('want', wantItemId);

  return {
    path: `/swap/searching?${params.toString()}`,
    state: {
      offeredItemId: input.offeredItemId,
      wantItemId,
      objectiveText,
      desiredCategory: input.target?.category,
      maxSteps,
      valueTolerancePct: VALUE_TOLERANCE_PCT,
    },
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
