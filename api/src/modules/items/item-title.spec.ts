import { normalizeItemTitle } from './item-title';

describe('normalizeItemTitle', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeItemTitle('  Cámara   CANON  eos ')).toBe('camara canon eos');
    expect(normalizeItemTitle('Cámara Canon EOS')).toBe(normalizeItemTitle('camara canon eos'));
    expect(normalizeItemTitle('Pingüino de peluche')).toBe('pinguino de peluche');
  });

  it('keeps different titles apart', () => {
    expect(normalizeItemTitle('Cámara Canon EOS')).not.toBe(normalizeItemTitle('Cámara Canon EOS R'));
  });
});
