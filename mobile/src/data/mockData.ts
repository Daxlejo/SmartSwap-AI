import type { User, Item, SwapRoute, Proposal } from '@/types';

import alexAvatar from '@/assets/avatar-alex.svg';
import carlosAvatar from '@/assets/avatar-carlos.svg';
import lauraAvatar from '@/assets/avatar-laura.svg';
import diegoAvatar from '@/assets/avatar-diego.svg';
import sofiaAvatar from '@/assets/avatar-sofia.svg';
import mateoAvatar from '@/assets/avatar-mateo.svg';
import elenaAvatar from '@/assets/avatar-elena.svg';
import davidAvatar from '@/assets/avatar-david.svg';

import bikeImg from '@/assets/item-bike.svg';
import ballImg from '@/assets/item-ball.svg';
import headphonesImg from '@/assets/item-headphones.svg';
import laptopImg from '@/assets/item-laptop.svg';
import cameraImg from '@/assets/item-camera.svg';
import switchImg from '@/assets/item-switch.svg';
import keyboardImg from '@/assets/item-keyboard.svg';
import ipadImg from '@/assets/item-ipad.svg';
import guitarImg from '@/assets/item-guitar.svg';
import lensImg from '@/assets/item-lens.svg';
import smartwatchImg from '@/assets/item-smartwatch.svg';
import monitorImg from '@/assets/item-monitor.svg';
import vintageBikeImg from '@/assets/item-vintage-bike.svg';

export const mockUsers: User[] = [
  {
    id: 'user-alex',
    name: 'Alex Morales',
    email: 'alex.morales@smartswap.io',
    avatarUrl: alexAvatar,
    rating: 4.9,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 14.2,
  },
  {
    id: 'user-carlos',
    name: 'Carlos R.',
    email: 'carlos.r@correo.es',
    avatarUrl: carlosAvatar,
    rating: 4.8,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 28.5,
  },
  {
    id: 'user-laura',
    name: 'Laura M.',
    email: 'laura.m@correo.es',
    avatarUrl: lauraAvatar,
    rating: 4.9,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 19.4,
  },
  {
    id: 'user-diego',
    name: 'Diego S.',
    email: 'diego.s@correo.es',
    avatarUrl: diegoAvatar,
    rating: 4.7,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 32.1,
  },
  {
    id: 'user-sofia',
    name: 'Sofía V.',
    email: 'sofia.v@correo.es',
    avatarUrl: sofiaAvatar,
    rating: 5.0,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 45.0,
  },
  {
    id: 'user-mateo',
    name: 'Mateo R.',
    email: 'mateo.r@correo.es',
    avatarUrl: mateoAvatar,
    rating: 4.8,
    location: 'Pasto, Nariño',
    verified: false,
    co2SavedKg: 12.8,
  },
  {
    id: 'user-elena',
    name: 'Elena M.',
    email: 'elena.m@correo.es',
    avatarUrl: elenaAvatar,
    rating: 4.9,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 22.0,
  },
  {
    id: 'user-david',
    name: 'David K.',
    email: 'david.k@correo.es',
    avatarUrl: davidAvatar,
    rating: 5.0,
    location: 'Pasto, Nariño',
    verified: true,
    co2SavedKg: 37.6,
  },
];

export const mockItems: Item[] = [
  // Item 1 - Current User
  {
    id: 'item-bike',
    name: 'Bicicleta Trek Marlin 7',
    category: 'Deportes',
    condition: 'Excelente estado',
    ownerId: 'user-alex',
    imageUrl: bikeImg,
    wants: ['item-camera', 'item-ipad'],
    description: 'Rodado 29" • Talle M • Frenos hidráulicos Shimano. Revisión hecha hace 1 mes.',
    estimatedValue: 3120000,
  },
  // Item 2 - Carlos (chain link 1 -> 2)
  {
    id: 'item-ball',
    name: 'Balón de Fútbol Match Pro',
    category: 'Deportes',
    condition: 'Como nuevo',
    ownerId: 'user-carlos',
    imageUrl: ballImg,
    wants: ['item-bike'],
    description: 'Balón oficial de torneo FIFA Quality Pro, cuero compuesto de alto rendimiento.',
    estimatedValue: 480000,
  },
  // Item 3 - Laura (chain link 2 -> 3)
  {
    id: 'item-headphones',
    name: 'Sony WH-1000XM5',
    category: 'Tecnología',
    condition: 'Excelente estado',
    ownerId: 'user-laura',
    imageUrl: headphonesImg,
    wants: ['item-ball'],
    description: 'Auriculares inalámbricos con cancelación de ruido activa líder y estuche original.',
    estimatedValue: 1560000,
  },
  // Item 4 - Diego (chain link 3 -> 4)
  {
    id: 'item-laptop',
    name: 'MacBook Air M2',
    category: 'Tecnología',
    condition: 'Excelente estado',
    ownerId: 'user-diego',
    imageUrl: laptopImg,
    wants: ['item-headphones', 'item-monitor'],
    description: '8GB RAM, 256GB SSD, color Medianoche. Batería con 98% de salud.',
    estimatedValue: 3400000,
  },
  // Item 5 - Sofia (chain link 4 -> 5 -> loops to item-bike)
  {
    id: 'item-camera',
    name: 'Cámara Fujifilm X-T30 II',
    category: 'Fotografía',
    condition: 'Como nuevo',
    ownerId: 'user-sofia',
    imageUrl: cameraImg,
    wants: ['item-laptop', 'item-switch'],
    description: 'Kit con lente 15-45mm. Menos de 2,000 disparos, incluye batería extra.',
    estimatedValue: 3160000,
  },
  // Item 6 - Mateo
  {
    id: 'item-switch',
    name: 'Nintendo Switch OLED',
    category: 'Videojuegos',
    condition: 'Buen estado',
    ownerId: 'user-mateo',
    imageUrl: switchImg,
    wants: ['item-bike', 'item-guitar'],
    description: 'Consola blanca completa con dock y cables, pantalla sin rayones.',
    estimatedValue: 1240000,
  },
  // Item 7 - Carlos
  {
    id: 'item-keyboard',
    name: 'Teclado Mecánico Keychron Q1 Pro',
    category: 'Tecnología',
    condition: 'Como nuevo',
    ownerId: 'user-carlos',
    imageUrl: keyboardImg,
    wants: ['item-headphones'],
    description: 'Switches Banana táctiles, chasis de aluminio CNC, inalámbrico Bluetooth.',
    estimatedValue: 840000,
  },
  // Item 8 - Elena
  {
    id: 'item-ipad',
    name: 'Apple iPad Air M2',
    category: 'Tecnología',
    condition: 'Como nuevo',
    ownerId: 'user-elena',
    imageUrl: ipadImg,
    wants: ['item-keyboard', 'item-vintage-bike'],
    description: '128GB Wi-Fi color azul espacial, incluye funda Smart Folio.',
    estimatedValue: 2880000,
  },
  // Item 9 - David
  {
    id: 'item-guitar',
    name: 'Guitarra Acústica Fender',
    category: 'Música',
    condition: 'Buen estado',
    ownerId: 'user-david',
    imageUrl: guitarImg,
    wants: ['item-ipad'],
    description: 'Tapa de abeto macizo, afinación perfecta, incluye funda acolchada.',
    estimatedValue: 1120000,
  },
  // Item 10 - Sofia
  {
    id: 'item-lens',
    name: 'Lente Sony 50mm f/1.8',
    category: 'Fotografía',
    condition: 'Excelente estado',
    ownerId: 'user-sofia',
    imageUrl: lensImg,
    wants: ['item-smartwatch'],
    description: 'Óptica nítida para retratos, montura E, sin hongos ni marcas.',
    estimatedValue: 760000,
  },
  // Item 11 - Alex (current user secondary item)
  {
    id: 'item-smartwatch',
    name: 'Garmin Forerunner 255',
    category: 'Deportes',
    condition: 'Buen estado',
    ownerId: 'user-alex',
    imageUrl: smartwatchImg,
    wants: ['item-lens'],
    description: 'Reloj GPS para corredores con monitor de frecuencia cardíaca.',
    estimatedValue: 960000,
  },
  // Item 12 - Diego
  {
    id: 'item-monitor',
    name: 'Monitor Dell UltraSharp 27"',
    category: 'Tecnología',
    condition: 'Excelente estado',
    ownerId: 'user-diego',
    imageUrl: monitorImg,
    wants: ['item-ipad'],
    description: 'Resolución 4K USB-C Hub con calibración de color precisa.',
    estimatedValue: 1840000,
  },
  // Item 13 - David
  {
    id: 'item-vintage-bike',
    name: 'Bicicleta Clásica de Ruta',
    category: 'Deportes',
    condition: 'Colección',
    ownerId: 'user-david',
    imageUrl: vintageBikeImg,
    wants: ['item-laptop'],
    description: 'Cuadro de acero Columbus original en verde esmeralda con sillín de cuero.',
    estimatedValue: 2600000,
  },
];

export const mockSwapRoute: SwapRoute = {
  id: 'route-fujifilm-loop',
  title: 'Ruta Inteligente Multiusuario',
  stepsCount: 4,
  targetItemId: 'item-camera',
  offeredItemId: 'item-bike',
  participants: [
    mockUsers[0], // Alex
    mockUsers[1], // Carlos
    mockUsers[2], // Laura
    mockUsers[3], // Diego
    mockUsers[4], // Sofia
  ],
  chainItems: [
    mockItems[0], // Bike
    mockItems[1], // Ball
    mockItems[2], // Headphones
    mockItems[3], // Laptop
    mockItems[4], // Camera
  ],
  co2SavedKg: 42.0,
  isLoop: true,
};

export const mockProposals: Proposal[] = [
  {
    id: 'prop-1',
    targetItemId: 'item-camera',
    offeredItemId: 'item-bike',
    proposerUserId: 'user-alex',
    recipientUserId: 'user-sofia',
    status: 'pending',
    createdAt: '2026-10-06T18:30:00Z',
  },
  {
    id: 'prop-2',
    targetItemId: 'item-keyboard',
    offeredItemId: 'item-smartwatch',
    proposerUserId: 'user-alex',
    recipientUserId: 'user-carlos',
    status: 'accepted',
    createdAt: '2026-10-05T12:00:00Z',
  },
  {
    id: 'prop-3',
    targetItemId: 'item-bike',
    offeredItemId: 'item-switch',
    proposerUserId: 'user-mateo',
    recipientUserId: 'user-alex',
    status: 'pending',
    createdAt: '2026-10-06T20:00:00Z',
  },
  {
    id: 'prop-4',
    targetItemId: 'item-smartwatch',
    offeredItemId: 'item-lens',
    proposerUserId: 'user-sofia',
    recipientUserId: 'user-alex',
    status: 'declined',
    createdAt: '2026-10-01T10:00:00Z',
  },
];
