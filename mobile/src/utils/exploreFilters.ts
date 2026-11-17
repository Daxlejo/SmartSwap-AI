import type { Item } from '@/types';

/** Catalog categories the filter offers; anything else counts as "Otros". */
export const EXPLORE_CATEGORIES = [
  'Tecnología',
  'Deportes',
  'Fotografía',
  'Videojuegos',
  'Música',
  'Hogar',
  'Otros',
] as const;

export const EXPLORE_CONDITIONS = [
  'Como nuevo',
  'Excelente estado',
  'Buen estado',
  'Para repuesto',
] as const;

export const EXPLORE_SORTS = ['relevance', 'priceAsc', 'priceDesc', 'recent'] as const;

export type ExploreCategory = (typeof EXPLORE_CATEGORIES)[number];
export type ExploreCondition = (typeof EXPLORE_CONDITIONS)[number];
export type ExploreSort = (typeof EXPLORE_SORTS)[number];

/** Filters applied to the loaded catalog. The zone is separate: it decides what the API loads. */
export interface ExploreFilters {
  category: ExploreCategory | null;
  condition: ExploreCondition | null;
  /** Whole pesos, inclusive. */
  minPrice: number | null;
  maxPrice: number | null;
  sort: ExploreSort;
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  category: null,
  condition: null,
  minPrice: null,
  maxPrice: null,
  sort: 'relevance',
};

/** One removable chip under the search bar. */
export type ActiveFilterKey = 'category' | 'condition' | 'price' | 'sort';

const KNOWN_CATEGORIES = new Set<string>(EXPLORE_CATEGORIES.filter((c) => c !== 'Otros'));

export const isPriceRangeValid = (filters: Pick<ExploreFilters, 'minPrice' | 'maxPrice'>): boolean =>
  filters.minPrice === null || filters.maxPrice === null || filters.minPrice <= filters.maxPrice;

const matchesCategory = (item: Item, category: ExploreCategory | null): boolean => {
  if (category === null) return true;
  if (category === 'Otros') return item.category === 'Otros' || !KNOWN_CATEGORIES.has(item.category);
  return item.category === category;
};

const matchesPrice = (item: Item, filters: ExploreFilters): boolean => {
  if (filters.minPrice === null && filters.maxPrice === null) return true;
  // An item without a price cannot prove it is inside the range
  if (item.estimatedValue === undefined) return false;
  if (filters.minPrice !== null && item.estimatedValue < filters.minPrice) return false;
  if (filters.maxPrice !== null && item.estimatedValue > filters.maxPrice) return false;
  return true;
};

const createdTime = (item: Item): number => (item.createdAt ? Date.parse(item.createdAt) || 0 : 0);

/**
 * Search text, category, condition and price, then the chosen order. "Relevance" keeps the
 * API's order (nearest first when the user has a municipality, newest first otherwise).
 */
export const applyExploreFilters = (
  items: readonly Item[],
  searchQuery: string,
  filters: ExploreFilters,
): Item[] => {
  const query = searchQuery.trim().toLowerCase();
  const result = items.filter(
    (item) =>
      (query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)) &&
      matchesCategory(item, filters.category) &&
      (filters.condition === null || item.condition.toLowerCase() === filters.condition.toLowerCase()) &&
      matchesPrice(item, filters),
  );

  switch (filters.sort) {
    case 'priceAsc':
      return result.sort(
        (a, b) => (a.estimatedValue ?? Number.POSITIVE_INFINITY) - (b.estimatedValue ?? Number.POSITIVE_INFINITY),
      );
    case 'priceDesc':
      return result.sort((a, b) => (b.estimatedValue ?? -1) - (a.estimatedValue ?? -1));
    case 'recent':
      return result.sort((a, b) => createdTime(b) - createdTime(a));
    default:
      return result;
  }
};

/** Which filters differ from the defaults, in the order their chips are shown. */
export const activeFilterKeys = (filters: ExploreFilters): ActiveFilterKey[] => {
  const keys: ActiveFilterKey[] = [];
  if (filters.category !== null) keys.push('category');
  if (filters.condition !== null) keys.push('condition');
  if (filters.minPrice !== null || filters.maxPrice !== null) keys.push('price');
  if (filters.sort !== 'relevance') keys.push('sort');
  return keys;
};

/** Removes one chip's filter. */
export const clearFilter = (filters: ExploreFilters, key: ActiveFilterKey): ExploreFilters => {
  switch (key) {
    case 'category':
      return { ...filters, category: null };
    case 'condition':
      return { ...filters, condition: null };
    case 'price':
      return { ...filters, minPrice: null, maxPrice: null };
    case 'sort':
      return { ...filters, sort: 'relevance' };
  }
};
