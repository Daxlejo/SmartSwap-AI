/** Material Symbols icon per catalog category, used by item placeholders. */
const CATEGORY_ICONS: Record<string, string> = {
  Tecnología: 'devices',
  Deportes: 'directions_run',
  Fotografía: 'photo_camera',
  Videojuegos: 'sports_esports',
  Música: 'music_note',
  Hogar: 'home',
  Otros: 'inventory_2',
};

/**
 * Icons for the things people swap most, matched on the item name: a backpack filed under
 * "Hogar" should not show a sofa, nor a bike under "Deportes" a ball.
 */
const ITEM_ICONS: Array<[RegExp, string]> = [
  [/bici|\bbike\b|\bmtb\b/, 'pedal_bike'],
  [/mochila|maleta|morral|backpack/, 'backpack'],
  [/cafetera|coffee/, 'coffee_maker'],
  [/guitarra|guitar|ukelele|violin|piano/, 'music_note'],
  [/audifono|auricular|headphone|airpods/, 'headphones'],
  [/parlante|bafle|speaker/, 'speaker'],
  [/reloj|watch|garmin/, 'watch'],
  [/camara|camera/, 'photo_camera'],
  [/celular|iphone|smartphone|telefono|phone/, 'smartphone'],
  [/tablet|ipad|kindle/, 'tablet'],
  [/laptop|portatil|macbook|computador/, 'laptop'],
  [/monitor|pantalla|televisor|\btv\b/, 'tv'],
  [/teclado|keyboard/, 'keyboard'],
  [/control|consola|playstation|\bps[345]\b|xbox|nintendo/, 'sports_esports'],
  [/libro|\bbook|novela/, 'menu_book'],
  [/patineta|skate|patines|scooter/, 'skateboarding'],
  [/balon|pelota|\bball\b/, 'sports_soccer'],
  [/silla|sofa|mueble|mesa|chair/, 'chair'],
  [/lampara|lamp/, 'lightbulb'],
  [/licuadora|olla|sarten|blender/, 'blender'],
  [/chaqueta|camisa|zapato|tenis|jacket|shoes/, 'checkroom'],
];

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const categoryIcon = (category?: string): string =>
  (category && CATEGORY_ICONS[category]) || 'inventory_2';

/** Icon for an item without a photo: by what it is when the name says so, else by category. */
export const itemIcon = (name?: string, category?: string): string => {
  if (name) {
    const normalized = normalize(name);
    const match = ITEM_ICONS.find(([pattern]) => pattern.test(normalized));
    if (match) return match[1];
  }
  return categoryIcon(category);
};
