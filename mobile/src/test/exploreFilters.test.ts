import { describe, expect, it } from 'vitest';
import type { Item } from '@/types';
import {
  DEFAULT_EXPLORE_FILTERS,
  activeFilterKeys,
  applyExploreFilters,
  clearFilter,
  isPriceRangeValid,
  type ExploreFilters,
} from '@/utils/exploreFilters';

const item = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  name: `Objeto ${id}`,
  category: 'Tecnología',
  condition: 'Buen estado',
  ownerId: 'owner',
  wants: [],
  estimatedValue: 300_000,
  status: 'ACTIVE',
  ...overrides,
});

const catalog: Item[] = [
  item('bici', { name: 'Bicicleta Trek', category: 'Deportes', estimatedValue: 900_000, createdAt: '2026-11-01T00:00:00Z' }),
  item('control', { name: 'Control PS5', category: 'Videojuegos', condition: 'Como nuevo', estimatedValue: 280_000, createdAt: '2026-11-10T00:00:00Z' }),
  item('libro', { name: 'Libro de cálculo', category: 'Libros', estimatedValue: 60_000, createdAt: '2026-11-05T00:00:00Z' }),
  item('sin-precio', { name: 'Lámpara', category: 'Hogar', estimatedValue: undefined }),
];

const withFilters = (overrides: Partial<ExploreFilters>): ExploreFilters => ({
  ...DEFAULT_EXPLORE_FILTERS,
  ...overrides,
});

const ids = (items: Item[]) => items.map((i) => i.id);

describe('explore filters', () => {
  it('keeps the API order and everything when nothing is set', () => {
    expect(ids(applyExploreFilters(catalog, '', DEFAULT_EXPLORE_FILTERS))).toEqual([
      'bici',
      'control',
      'libro',
      'sin-precio',
    ]);
  });

  it('filters by an inclusive COP range and leaves out items without a price', () => {
    const result = applyExploreFilters(catalog, '', withFilters({ minPrice: 60_000, maxPrice: 280_000 }));
    expect(ids(result)).toEqual(['control', 'libro']);
  });

  it('accepts an open-ended range', () => {
    expect(ids(applyExploreFilters(catalog, '', withFilters({ minPrice: 500_000 })))).toEqual(['bici']);
  });

  it('puts unknown categories under Otros', () => {
    expect(ids(applyExploreFilters(catalog, '', withFilters({ category: 'Otros' })))).toEqual(['libro']);
  });

  it('combines search, condition and sort by price', () => {
    expect(ids(applyExploreFilters(catalog, 'control', withFilters({ condition: 'Como nuevo' })))).toEqual([
      'control',
    ]);
    expect(ids(applyExploreFilters(catalog, '', withFilters({ sort: 'priceAsc' })))).toEqual([
      'libro',
      'control',
      'bici',
      'sin-precio',
    ]);
    expect(ids(applyExploreFilters(catalog, '', withFilters({ sort: 'priceDesc' }))).slice(0, 3)).toEqual([
      'bici',
      'control',
      'libro',
    ]);
  });

  it('sorts the most recent first by publication date', () => {
    expect(ids(applyExploreFilters(catalog, '', withFilters({ sort: 'recent' }))).slice(0, 3)).toEqual([
      'control',
      'libro',
      'bici',
    ]);
  });

  it('does not change the list it receives', () => {
    const copy = [...catalog];
    applyExploreFilters(catalog, '', withFilters({ sort: 'priceAsc' }));
    expect(catalog).toEqual(copy);
  });

  it('lists one chip per active filter and removes each one', () => {
    const filters = withFilters({ category: 'Deportes', minPrice: 1, sort: 'recent' });
    expect(activeFilterKeys(filters)).toEqual(['category', 'price', 'sort']);
    expect(activeFilterKeys(clearFilter(filters, 'price'))).toEqual(['category', 'sort']);
    expect(activeFilterKeys(DEFAULT_EXPLORE_FILTERS)).toEqual([]);
  });

  it('rejects a minimum above the maximum', () => {
    expect(isPriceRangeValid({ minPrice: 500_000, maxPrice: 100_000 })).toBe(false);
    expect(isPriceRangeValid({ minPrice: 100_000, maxPrice: null })).toBe(true);
  });
});
