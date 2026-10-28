import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '@/utils/relativeTime';

const now = new Date('2026-10-28T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe('formatRelativeTime', () => {
  it('formats recent moments in Spanish by default usage', () => {
    expect(formatRelativeTime(ago(10), 'es', now)).toBe('ahora');
    expect(formatRelativeTime(ago(5 * 60), 'es', now)).toBe('hace 5 min');
    expect(formatRelativeTime(ago(2 * 3600), 'es', now)).toBe('hace 2 h');
    expect(formatRelativeTime(ago(86400), 'es', now)).toBe('ayer');
  });

  it('formats the same moments in English', () => {
    expect(formatRelativeTime(ago(10), 'en', now)).toBe('now');
    expect(formatRelativeTime(ago(5 * 60), 'en', now)).toBe('5 min. ago');
    expect(formatRelativeTime(ago(2 * 3600), 'en', now)).toBe('2 hr. ago');
    expect(formatRelativeTime(ago(86400), 'en', now)).toBe('yesterday');
  });

  it('accepts ISO strings and handles invalid input', () => {
    expect(formatRelativeTime(ago(3 * 60).toISOString(), 'es', now)).toBe('hace 3 min');
    expect(formatRelativeTime('not-a-date', 'en', now)).toBe('now');
    expect(formatRelativeTime(undefined, 'es', now)).toBe('ahora');
  });

  it('falls back to a calendar date after four weeks', () => {
    const old = new Date('2026-08-01T12:00:00Z');
    expect(formatRelativeTime(old, 'en', now)).toBe('Aug 1');
  });
});
