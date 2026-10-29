import { describe, expect, it } from 'vitest';
import {
  avatarDataUri,
  avatarTraitsFor,
  buildAvatarSvg,
  hashName,
} from '@/utils/avatarArt';

describe('avatarArt', () => {
  it('is deterministic and ignores case and surrounding spaces', () => {
    expect(hashName('Alex Rivera')).toBe(hashName('  alex rivera '));
    expect(buildAvatarSvg('Alex Rivera')).toBe(buildAvatarSvg('alex rivera'));
  });

  it('gives different people different faces', () => {
    const names = ['Alex', 'Valeria', 'Mateo', 'Sofía', 'Carlos', 'Laura', 'Diego', 'Elena'];
    const faces = new Set(names.map((n) => JSON.stringify(avatarTraitsFor(n))));
    expect(faces.size).toBeGreaterThan(5);
  });

  it('produces a self-contained SVG data URI', () => {
    const uri = avatarDataUri('Valeria Gómez');
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    const svg = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('href');
  });

  it('never throws on empty names', () => {
    expect(() => buildAvatarSvg('')).not.toThrow();
  });
});
