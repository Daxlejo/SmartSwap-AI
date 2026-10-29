/** Material Symbols icon per catalog category, used by item placeholders. */
const CATEGORY_ICONS: Record<string, string> = {
  Tecnología: 'devices',
  Deportes: 'sports_soccer',
  Fotografía: 'photo_camera',
  Videojuegos: 'sports_esports',
  Música: 'music_note',
  Hogar: 'chair',
  Otros: 'inventory_2',
};

export const categoryIcon = (category?: string): string =>
  (category && CATEGORY_ICONS[category]) || 'inventory_2';
