/**
 * Identity for people without a profile photo: their initials on a colour that is always the
 * same for the same person (seeded by user id when there is one), so a ring of four people
 * never shows four identical faces. White text passes WCAG AA on every colour below.
 */

const AVATAR_COLORS = [
  '#00685f', // primary teal
  '#9d4300', // deep orange
  '#006194', // blue
  '#475569', // slate
  '#00544d', // dark teal
  '#7c3aed', // violet
  '#b4235a', // raspberry
  '#3f6212', // olive
] as const;

/** 32-bit FNV-1a: stable across sessions and devices, enough to spread ids over the palette. */
export const hashSeed = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (const char of seed.trim().toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const avatarColorFor = (seed: string): string =>
  AVATAR_COLORS[hashSeed(seed) % AVATAR_COLORS.length];

/** "Valeria Gómez Ruiz" -> "VG", "alex" -> "A", "" -> "". */
export const initialsFor = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = Array.from(words[0])[0] ?? '';
  const second = words.length > 1 ? (Array.from(words[1])[0] ?? '') : '';
  return `${first}${second}`.toLocaleUpperCase('es');
};
