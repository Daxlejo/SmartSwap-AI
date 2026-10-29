/**
 * Deterministic illustrated avatar: the same name always gives the same face, with no network
 * and no external service. Colours stay inside the brand palette (teal, orange, blue, slate).
 */

const BACKGROUNDS = ['#d3ede9', '#ffe4d2', '#dbeafe', '#e2e8f0', '#a9dbd4', '#ffc7a3'];
const SKINS = ['#f5d3b3', '#e8b98f', '#c98f63', '#a5714a', '#7b5136'];
const HAIRS = ['#1e293b', '#3b2a20', '#6b4423', '#9d4300', '#475569', '#0f172a'];
const SHIRTS = ['#00685f', '#fd761a', '#006194', '#00544d', '#9d4300', '#475569'];
const HAIR_STYLES = ['short', 'long', 'bun', 'cap'] as const;

type HairStyle = (typeof HAIR_STYLES)[number];

export interface AvatarTraits {
  background: string;
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: HairStyle;
}

/** 32-bit FNV-1a, enough to spread names across the trait tables. */
export const hashName = (name: string): number => {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const pick = <T>(table: readonly T[], seed: number, shift: number): T =>
  table[Math.floor(seed / 2 ** shift) % table.length];

export const avatarTraitsFor = (name: string): AvatarTraits => {
  const seed = hashName(name);
  return {
    background: pick(BACKGROUNDS, seed, 0),
    skin: pick(SKINS, seed, 3),
    hair: pick(HAIRS, seed, 6),
    shirt: pick(SHIRTS, seed, 9),
    hairStyle: pick(HAIR_STYLES, seed, 12),
  };
};

const hairBack = (style: HairStyle, hair: string): string => {
  if (style === 'long') {
    return `<path d="M26 52c0-22 9-32 22-32s22 10 22 32v22H26z" fill="${hair}"/>`;
  }
  if (style === 'bun') {
    return `<circle cx="48" cy="17" r="8" fill="${hair}"/>`;
  }
  return '';
};

const hairFront = (style: HairStyle, hair: string): string => {
  if (style === 'cap') {
    return `<path d="M31 40c0-12 7-19 17-19s17 7 17 19z" fill="${hair}"/><rect x="29" y="38" width="38" height="5" rx="2.5" fill="${hair}"/>`;
  }
  return `<path d="M31 42c-1-14 6-21 17-21s18 7 17 21c-4-6-10-9-17-9s-13 3-17 9z" fill="${hair}"/>`;
};

export const buildAvatarSvg = (name: string): string => {
  const { background, skin, hair, shirt, hairStyle } = avatarTraitsFor(name);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">',
    `<rect width="96" height="96" fill="${background}"/>`,
    hairBack(hairStyle, hair),
    `<path d="M12 96c0-17 15-27 36-27s36 10 36 27z" fill="${shirt}"/>`,
    `<rect x="41" y="56" width="14" height="16" rx="6" fill="${skin}"/>`,
    `<ellipse cx="48" cy="42" rx="17" ry="19" fill="${skin}"/>`,
    hairFront(hairStyle, hair),
    '<circle cx="42" cy="46" r="1.8" fill="#0f172a"/>',
    '<circle cx="54" cy="46" r="1.8" fill="#0f172a"/>',
    '<path d="M43 53q5 4 10 0" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>',
    '</svg>',
  ].join('');
};

export const avatarDataUri = (name: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(buildAvatarSvg(name))}`;
