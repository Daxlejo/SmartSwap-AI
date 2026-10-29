import { describe, it, expect } from 'vitest';
import { formatCop, formatCopDigits, sanitizeCopDigits } from '@/utils/currency';

/** Intl separates the symbol with a non-breaking space; normalize it for readable assertions. */
const plain = (value: string): string => value.replace(/ /g, ' ');

describe('currency (Colombian pesos)', () => {
  it('formats amounts with the peso sign and dot thousand separators', () => {
    expect(plain(formatCop(2_600_000))).toBe('$ 2.600.000');
    expect(plain(formatCop(980_000))).toBe('$ 980.000');
    expect(plain(formatCop(0))).toBe('$ 0');
  });

  it('rounds to whole pesos and never shows decimals', () => {
    expect(plain(formatCop(1_234_567.8))).toBe('$ 1.234.568');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatCop(undefined)).toBe('');
    expect(formatCop(null)).toBe('');
    expect(formatCop(Number.NaN)).toBe('');
  });

  it('keeps only digits from user input and caps the length', () => {
    expect(sanitizeCopDigits('$ 2.600.000')).toBe('2600000');
    expect(sanitizeCopDigits('abc')).toBe('');
    expect(sanitizeCopDigits('123456789012345')).toHaveLength(11);
  });

  it('groups digits for display inside an input', () => {
    expect(formatCopDigits('2600000')).toBe('2.600.000');
    expect(formatCopDigits('')).toBe('');
  });
});
