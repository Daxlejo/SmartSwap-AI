import { describe, expect, it } from 'vitest';
import { findDuplicateTitle, normalizeItemTitle } from '@/utils/itemTitle';

describe('normalizeItemTitle', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeItemTitle('  Cámara   CANON  eos ')).toBe('camara canon eos');
  });
});

describe('findDuplicateTitle', () => {
  const mine = [
    { name: 'Cámara Canon EOS', status: 'PENDING_SWAP' },
    { name: 'Bicicleta Trek Marlin', status: 'ACTIVE' },
    { name: 'Libro viejo', status: 'SWAPPED' },
  ];

  it('blocks a title reserved in a swap in progress', () => {
    expect(findDuplicateTitle(mine, 'camara  canon eos')).toBe('inSwap');
  });

  it('only warns about an active twin', () => {
    expect(findDuplicateTitle(mine, 'BICICLETA trek marlin')).toBe('active');
  });

  it('ignores swapped items, other titles and an empty title', () => {
    expect(findDuplicateTitle(mine, 'Libro viejo')).toBeNull();
    expect(findDuplicateTitle(mine, 'Cámara Canon EOS R')).toBeNull();
    expect(findDuplicateTitle(mine, '   ')).toBeNull();
  });
});
