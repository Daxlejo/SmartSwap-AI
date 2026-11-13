/** Why the route search cannot start yet; `null` means the engine can be called. */
export type SwapSearchBlocker = 'noItems' | 'noWant' | null;

/** Shortest objective text the engine accepts. */
export const MIN_OBJECTIVE_LENGTH = 2;

/**
 * Decides whether Configure swap may call the route engine. The user needs a
 * published item to offer and a chosen objective; otherwise the search (and the
 * AI explanation that follows it) must not run.
 */
export const getSwapSearchBlocker = (
  publishedItemsCount: number,
  objectiveText: string,
): SwapSearchBlocker => {
  if (publishedItemsCount === 0) return 'noItems';
  if (objectiveText.trim().length < MIN_OBJECTIVE_LENGTH) return 'noWant';
  return null;
};
