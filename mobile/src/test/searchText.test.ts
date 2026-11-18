import { describe, expect, it } from 'vitest';
import type { Item } from '@/types';
import { matchesSearch, normalizeSearchText } from '@/utils/searchText';
import { DEFAULT_EXPLORE_FILTERS, applyExploreFilters } from '@/utils/exploreFilters';
import { findWantedCandidates } from '@/utils/swapSearch';

const camera: Item = {
  id: 'cam',
  name: 'Cámara Canon EOS',
  category: 'Fotografía',
  condition: 'Buen estado',
  ownerId: 'other',
  wants: [],
  status: 'ACTIVE',
};

describe('accent-insensitive search', () => {
  it('normalizes case, accents and spaces', () => {
    expect(normalizeSearchText('  CÁMARA   Canon ')).toBe('camara canon');
    expect(matchesSearch('camara', ['Cámara Canon'])).toBe(true);
    expect(matchesSearch('', ['anything'])).toBe(true);
    expect(matchesSearch('tablet', ['Cámara Canon', undefined])).toBe(false);
  });

  it('Explore: "Camara" finds "Cámara", also by category without accent', () => {
    expect(applyExploreFilters([camera], 'Camara', DEFAULT_EXPLORE_FILTERS)).toHaveLength(1);
    expect(applyExploreFilters([camera], 'fotografia', DEFAULT_EXPLORE_FILTERS)).toHaveLength(1);
  });

  it('New swap step 2: "Camara" finds "Cámara"', () => {
    expect(findWantedCandidates([camera], 'Camara', 'me').map((item) => item.id)).toEqual(['cam']);
  });
});
