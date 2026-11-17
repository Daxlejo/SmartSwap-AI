/**
 * Sanity limits for AI price estimates, in whole Colombian pesos (COP).
 *
 * The model's answer is only shown when its range is coherent (min <= estimate <= max), narrow
 * (max <= 2 x min) and inside the plausible band of the item's category. Anything else is
 * discarded so the publish form shows no suggestion instead of a misleading one.
 */

export type PriceCategoryKey =
  | 'technology'
  | 'gaming'
  | 'sports'
  | 'photography'
  | 'music'
  | 'home'
  | 'books'
  | 'other';

export interface CategoryPriceBounds {
  min: number;
  max: number;
}

export const CATEGORY_PRICE_BOUNDS: Record<PriceCategoryKey, CategoryPriceBounds> = {
  technology: { min: 20_000, max: 12_000_000 },
  gaming: { min: 20_000, max: 5_000_000 },
  sports: { min: 10_000, max: 8_000_000 },
  photography: { min: 30_000, max: 15_000_000 },
  music: { min: 20_000, max: 10_000_000 },
  home: { min: 10_000, max: 5_000_000 },
  books: { min: 5_000, max: 500_000 },
  other: { min: 5_000, max: 5_000_000 },
};

/** The widest range accepted: the maximum may be at most this many times the minimum. */
export const MAX_RANGE_RATIO = 2;

const CATEGORY_KEYWORDS: Array<[PriceCategoryKey, string[]]> = [
  ['gaming', ['videojuego', 'gaming', 'consola', 'juego', 'game']],
  ['photography', ['fotograf', 'photo', 'camara', 'camera']],
  ['music', ['music', 'musica', 'instrument', 'audio']],
  ['technology', ['tecnolog', 'technology', 'tech', 'comput', 'electr', 'celular', 'phone']],
  ['sports', ['deport', 'sport', 'bici', 'fitness']],
  ['home', ['hogar', 'home', 'casa', 'mueble']],
  ['books', ['libro', 'book', 'educa']],
];

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Maps a free-text category (Spanish UI label or AI label) to its price band. */
export function resolvePriceCategory(category: string): PriceCategoryKey {
  const normalized = stripAccents(category.trim().toLowerCase());
  const match = CATEGORY_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return match ? match[0] : 'other';
}

/** Rounds to a tidy peso step: thousands below 100.000, tens of thousands above. */
export function roundCop(value: number): number {
  const step = value < 100_000 ? 1_000 : 10_000;
  return Math.round(value / step) * step;
}

export interface PriceRange {
  estimatedValue: number;
  minValue: number;
  maxValue: number;
}

export type PriceRangeRejection = 'incoherent_range' | 'range_too_wide' | 'out_of_category_bounds';

/** Rounds a raw range and checks it against the rules above; returns why it was rejected, if so. */
export function checkPriceRange(
  raw: PriceRange,
  category: string,
): { ok: true; range: PriceRange } | { ok: false; reason: PriceRangeRejection } {
  const range: PriceRange = {
    estimatedValue: roundCop(raw.estimatedValue),
    minValue: roundCop(raw.minValue),
    maxValue: roundCop(raw.maxValue),
  };

  if (
    range.minValue <= 0 ||
    range.minValue > range.estimatedValue ||
    range.estimatedValue > range.maxValue
  ) {
    return { ok: false, reason: 'incoherent_range' };
  }
  if (range.maxValue > range.minValue * MAX_RANGE_RATIO) {
    return { ok: false, reason: 'range_too_wide' };
  }

  const bounds = CATEGORY_PRICE_BOUNDS[resolvePriceCategory(category)];
  if (range.minValue < bounds.min || range.maxValue > bounds.max) {
    return { ok: false, reason: 'out_of_category_bounds' };
  }

  return { ok: true, range };
}
