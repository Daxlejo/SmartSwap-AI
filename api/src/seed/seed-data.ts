import { ItemCondition } from '@prisma/client';

/** Pure demo data for the seed: no I/O, so tests can check it without a database. */

export interface SeedUserSpec {
  id: string;
  email: string;
  name: string;
  initials: string;
  /** 5-digit DANE municipality code; department and label are derived from it. */
  municipalityCode: string;
  level: number;
  rating: number;
  tradesCompleted: number;
  co2SavedKg: number;
}

export interface SeedItemSpec {
  id: string;
  ownerEmail: string;
  name: string;
  category: string;
  condition: ItemCondition;
  description: string;
  /** Colombian pesos (COP), whole numbers. */
  estimatedValue: number;
  /** File name inside prisma/seed-assets, uploaded to Supabase Storage. */
  photo: string;
  aiTags: string[];
  wants: string[];
  /** Items locked by the in-progress proposal start as PENDING_SWAP. */
  lockedByProposal?: boolean;
}

export const uuid = (prefix: number, n: number): string =>
  `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const DEMO_USERS: SeedUserSpec[] = [
  { id: uuid(1, 1), email: 'alex@smartswap.co', name: 'Alex Rivera', initials: 'AR', municipalityCode: '52001', level: 3, rating: 4.9, tradesCompleted: 14, co2SavedKg: 48.5 },
  { id: uuid(1, 2), email: 'valeria@smartswap.co', name: 'Valeria Gómez', initials: 'VG', municipalityCode: '52240', level: 2, rating: 4.8, tradesCompleted: 9, co2SavedKg: 31.2 },
  { id: uuid(1, 3), email: 'mateo@smartswap.co', name: 'Mateo Vargas', initials: 'MV', municipalityCode: '52683', level: 3, rating: 5.0, tradesCompleted: 19, co2SavedKg: 64.0 },
  { id: uuid(1, 4), email: 'camila@smartswap.co', name: 'Camila Torres', initials: 'CT', municipalityCode: '52885', level: 1, rating: 4.7, tradesCompleted: 5, co2SavedKg: 17.8 },
  { id: uuid(1, 5), email: 'diego@smartswap.co', name: 'Diego Santacruz', initials: 'DS', municipalityCode: '52381', level: 2, rating: 4.6, tradesCompleted: 7, co2SavedKg: 22.4 },
  { id: uuid(1, 6), email: 'laura@smartswap.co', name: 'Laura Insuasty', initials: 'LI', municipalityCode: '52207', level: 1, rating: 4.8, tradesCompleted: 4, co2SavedKg: 12.1 },
];

export const DEMO_ITEMS: SeedItemSpec[] = [
  // Alex: one item per discovered cycle, plus the one locked in the proposal.
  { id: uuid(2, 1), ownerEmail: 'alex@smartswap.co', name: 'Bicicleta de montaña Trek Marlin', category: 'Deportes', condition: ItemCondition.GOOD, description: 'Rodado 29, 21 velocidades, frenos de disco recién ajustados. Ideal para las lomas de Pasto.', estimatedValue: 900_000, photo: 'bike.jpg', aiTags: ['bicicleta', 'montaña', 'ciclismo'], wants: ['Guitarra'] },
  { id: uuid(2, 2), ownerEmail: 'alex@smartswap.co', name: 'Audífonos Sony WH-1000XM4', category: 'Tecnología', condition: ItemCondition.LIKE_NEW, description: 'Cancelación de ruido, batería de 30 horas, estuche y cable originales.', estimatedValue: 700_000, photo: 'headphones.jpg', aiTags: ['audifonos', 'sony', 'sonido'], wants: ['Tablet'] },
  { id: uuid(2, 3), ownerEmail: 'alex@smartswap.co', name: 'Reloj deportivo Garmin Forerunner', category: 'Deportes', condition: ItemCondition.LIKE_NEW, description: 'GPS y monitor de pulso, correa nueva, sin rayones en la pantalla.', estimatedValue: 1_100_000, photo: 'watch.jpg', aiTags: ['reloj', 'garmin', 'running'], wants: ['Consola Nintendo'] },
  { id: uuid(2, 4), ownerEmail: 'alex@smartswap.co', name: 'Mochila Totto Dayhike', category: 'Hogar', condition: ItemCondition.GOOD, description: 'Mochila resistente al agua con compartimento para portátil de 15 pulgadas.', estimatedValue: 300_000, photo: 'backpack.jpg', aiTags: ['mochila', 'totto', 'viaje'], wants: ['Parlante'], lockedByProposal: true },
  // Valeria
  { id: uuid(2, 5), ownerEmail: 'valeria@smartswap.co', name: 'Guitarra acústica Yamaha F310', category: 'Música', condition: ItemCondition.GOOD, description: 'Cuerdas nuevas, tapa en abeto, incluye funda acolchada y cejilla.', estimatedValue: 850_000, photo: 'guitar.jpg', aiTags: ['guitarra', 'yamaha', 'acustica'], wants: ['Bicicleta'] },
  { id: uuid(2, 6), ownerEmail: 'valeria@smartswap.co', name: 'Consola Nintendo Switch OLED', category: 'Videojuegos', condition: ItemCondition.LIKE_NEW, description: 'Pantalla OLED, dock y dos controles Joy-Con, con dos juegos físicos.', estimatedValue: 1_000_000, photo: 'switch.jpg', aiTags: ['nintendo', 'consola', 'switch'], wants: ['Cámara'] },
  // Mateo
  { id: uuid(2, 7), ownerEmail: 'mateo@smartswap.co', name: 'Teclado mecánico Keychron K2', category: 'Tecnología', condition: ItemCondition.LIKE_NEW, description: 'Inalámbrico, switches marrones, retroiluminado, distribución en español.', estimatedValue: 680_000, photo: 'keyboard.jpg', aiTags: ['teclado', 'keychron', 'mecanico'], wants: ['Audífonos'] },
  { id: uuid(2, 8), ownerEmail: 'mateo@smartswap.co', name: 'Zapatillas Nike Air Zoom talla 42', category: 'Ropa', condition: ItemCondition.GOOD, description: 'Usadas pocas veces para correr, suela en excelente estado.', estimatedValue: 310_000, photo: 'sneakers.jpg', aiTags: ['zapatillas', 'nike', 'running'], wants: ['Mochila'], lockedByProposal: true },
  // Camila
  { id: uuid(2, 9), ownerEmail: 'camila@smartswap.co', name: 'Tablet Apple iPad 9.ª generación', category: 'Tecnología', condition: ItemCondition.GOOD, description: '64 GB, pantalla de 10,2 pulgadas, batería al 90 % y funda incluida.', estimatedValue: 720_000, photo: 'tablet.jpg', aiTags: ['tablet', 'ipad', 'apple'], wants: ['Teclado'] },
  // Diego
  { id: uuid(2, 10), ownerEmail: 'diego@smartswap.co', name: 'Lente Sigma 18-35mm f/1.8', category: 'Fotografía', condition: ItemCondition.LIKE_NEW, description: 'Lente luminoso para montura Canon, con parasol y tapas originales.', estimatedValue: 1_000_000, photo: 'lens.jpg', aiTags: ['lente', 'sigma', 'fotografia'], wants: ['Reloj'] },
  { id: uuid(2, 11), ownerEmail: 'diego@smartswap.co', name: 'Parlante JBL Flip 5', category: 'Tecnología', condition: ItemCondition.GOOD, description: 'Bluetooth, resistente al agua, batería de 12 horas.', estimatedValue: 290_000, photo: 'speaker.jpg', aiTags: ['parlante', 'jbl', 'bluetooth'], wants: ['Zapatillas'], lockedByProposal: true },
  // Laura
  { id: uuid(2, 12), ownerEmail: 'laura@smartswap.co', name: 'Cámara Sony Alpha a6400', category: 'Fotografía', condition: ItemCondition.LIKE_NEW, description: 'Mirrorless 4K con lente kit 16-50mm, batería extra y bolso.', estimatedValue: 1_050_000, photo: 'camera.jpg', aiTags: ['camara', 'sony', 'mirrorless'], wants: ['Lente'] },
];

/** Proposal: Alex gives backpack -> Mateo gives sneakers -> Diego gives speaker -> Alex. */
export const PROPOSAL_STEPS: Array<{
  order: number;
  email: string;
  gives: string;
  receives: string;
  accepted: boolean;
}> = [
  { order: 0, email: 'alex@smartswap.co', gives: uuid(2, 4), receives: uuid(2, 11), accepted: true },
  { order: 1, email: 'mateo@smartswap.co', gives: uuid(2, 8), receives: uuid(2, 4), accepted: true },
  { order: 2, email: 'diego@smartswap.co', gives: uuid(2, 11), receives: uuid(2, 8), accepted: false },
];
