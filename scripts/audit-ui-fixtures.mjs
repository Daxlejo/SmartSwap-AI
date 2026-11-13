/**
 * Deterministic API responses for `npm run audit:ui`.
 *
 * The audit measures layout, type and contrast, so it must not depend on the
 * live database, on Render being awake or on the demo password. Every request
 * to `/api/v1/*` is answered from here. Names and texts are realistic in
 * length on purpose: a short fixture would hide truncation problems.
 */

const NOW = '2026-11-12T15:00:00.000Z';

const pasto = { code: '52001', name: 'Pasto', departmentCode: '52', departmentName: 'Nariño', label: 'Pasto, Nariño' };
const ipiales = { code: '52356', name: 'Ipiales', departmentCode: '52', departmentName: 'Nariño', label: 'Ipiales, Nariño' };
const tuquerres = { code: '52838', name: 'Túquerres', departmentCode: '52', departmentName: 'Nariño', label: 'Túquerres, Nariño' };

const user = (id, name, municipality, extra = {}) => ({
  id,
  name,
  email: `${id}@example.com`,
  avatarUrl: null,
  location: municipality.label,
  departmentCode: municipality.departmentCode,
  municipalityCode: municipality.code,
  rating: 4.8,
  level: 2,
  tradesCompleted: 3,
  co2SavedKg: 0,
  verified: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...extra,
});

export const me = user('u-me', 'Alejandra Cabrera', pasto);
const laura = user('u-laura', 'Laura Benavides Ortega', ipiales);
const camilo = user('u-camilo', 'Camilo Andrés Guerrero', tuquerres);
const sofia = user('u-sofia', 'Sofía Rosero', pasto);

const owner = (u) => ({ id: u.id, name: u.name, avatarUrl: null, rating: u.rating, location: u.location, verified: false });

const item = (id, name, category, ownerUser, estimatedValue, extra = {}) => ({
  id,
  name,
  category,
  condition: 'EXCELLENT',
  ownerId: ownerUser.id,
  imageUrl: null,
  images: [],
  wants: ['Bicicleta', 'Libros'],
  description: 'Funciona perfecto, poco uso. Lo entrego en el centro de la ciudad.',
  estimatedValue,
  location: ownerUser.location,
  departmentCode: ownerUser.departmentCode,
  municipalityCode: ownerUser.municipalityCode,
  distanceKm: 12,
  status: 'AVAILABLE',
  aiTags: [],
  owner: owner(ownerUser),
  createdAt: NOW,
  ...extra,
});

export const myItems = [
  item('i-me-1', 'Mochila de senderismo Osprey 40 litros', 'Deportes', me, 280000),
  item('i-me-2', 'Parlante Bluetooth JBL Charge 4', 'Electrónica', me, 350000),
];

const publicItems = [
  item('i-laura-1', 'Bicicleta de montaña Trek Marlin 5 rin 29', 'Deportes', laura, 1200000),
  item('i-camilo-1', 'Colección de libros de García Márquez en tapa dura', 'Libros', camilo, 300000),
  item('i-sofia-1', 'Cafetera de goteo Oster con jarra térmica', 'Hogar', sofia, 180000),
  item('i-laura-2', 'Guitarra acústica Yamaha C40 con estuche', 'Música', laura, 420000),
  item('i-camilo-2', 'Chaqueta impermeable Columbia talla M', 'Ropa', camilo, 250000),
];

const step = (order, from, to, gives, receives, acceptance) => ({
  id: `s-${order}`,
  stepOrder: order,
  userId: from.id,
  user: from,
  toUserId: to.id,
  toUser: to,
  givesItemId: gives.id,
  givesItem: gives,
  receivesItemId: receives.id,
  receivesItem: receives,
  acceptance,
  respondedAt: acceptance === 'PENDING' ? null : NOW,
  deliveryConfirmed: false,
});

const [mochila] = myItems;
const [bici, libros] = publicItems;

/** A 3-person cycle proposed by Laura where the viewer still has to answer. */
export const activeRoute = {
  id: 'r-active',
  code: 'SW-4821',
  initiatorId: laura.id,
  objectiveText: 'Bicicleta',
  matchScore: 0.86,
  // The API maps SUGGESTED and ACTIVE to PROPOSED (RouteMapper.mapRouteStatus)
  status: 'PROPOSED',
  aiExplanation: 'Tú entregas la mochila a Camilo, Camilo entrega los libros a Laura y Laura te entrega la bicicleta.',
  co2SavedKg: 0,
  expiresAt: '2026-11-14T15:00:00.000Z',
  createdAt: NOW,
  steps: [
    step(1, me, camilo, mochila, bici, 'PENDING'),
    step(2, camilo, laura, libros, mochila, 'ACCEPTED'),
    step(3, laura, me, bici, libros, 'ACCEPTED'),
  ],
};

/** The same cycle as a search returns it: an unsaved preview, also marked PROPOSED. */
export const suggestedRoute = { ...activeRoute, id: 'preview-00ab12cd', code: 'SW-5310', status: 'PROPOSED', initiatorId: me.id };

export const notifications = [
  {
    id: 'n-1',
    type: 'ROUTE_PROPOSAL',
    title: 'Laura Benavides te propuso un intercambio',
    body: 'Tu mochila puede cerrar un ciclo de 3 personas. Revisa la propuesta antes de que venza.',
    isRead: false,
    routeId: activeRoute.id,
    createdAt: NOW,
  },
  {
    id: 'n-2',
    type: 'SYSTEM_WELCOME',
    title: 'Bienvenida a SmartSwap',
    body: 'Publica un objeto para empezar a recibir propuestas.',
    isRead: true,
    createdAt: '2026-11-01T12:00:00.000Z',
  },
];

/** Returns `[status, body]` for an API path (without the `/api/v1` prefix), or null when unknown. */
export const respond = (method, path) => {
  const p = path.replace(/\?.*$/, '');
  if (p === '/health') return [200, { status: 'ok' }];
  if (p === '/auth/me' || p === '/users/me') return [200, me];
  if (p === '/auth/login' || p === '/auth/register') return [201, { accessToken: 'audit-token', user: me }];
  if (p === '/geo/departments') return [200, [{ code: '52', name: 'Nariño' }, { code: '11', name: 'Bogotá, D.C.' }]];
  if (p === '/geo/municipalities') return [200, [pasto, ipiales, tuquerres]];
  if (p === '/geo/resolve') return [200, { municipality: pasto, distanceKm: 1 }];
  if (p === '/items/me' || p === '/items/mine') return [200, myItems];
  if (p === '/items' && method === 'GET') return [200, publicItems];
  if (p.startsWith('/items/') && method === 'GET') {
    const found = [...myItems, ...publicItems].find((i) => i.id === p.split('/')[2]);
    return found ? [200, found] : [404, { message: 'Not found' }];
  }
  if ((p === '/routes' || p === '/proposals') && method === 'GET') return [200, [activeRoute]];
  if (p === '/routes/search' || p === '/routes/find') return [200, [suggestedRoute]];
  if (p === '/routes/propose' || p === '/proposals') return [201, { ...suggestedRoute, id: 'r-new', status: 'PROPOSED' }];
  if (p.startsWith('/routes/') || p.startsWith('/proposals/')) {
    const id = p.split('/')[2];
    return [200, id === suggestedRoute.id || id === suggestedRoute.code ? suggestedRoute : activeRoute];
  }
  if (p === '/notifications') return [200, notifications];
  if (p === '/notifications/unread-count') return [200, { unreadCount: 1 }];
  if (p.startsWith('/notifications/')) return [200, { updatedCount: 1 }];
  if (p === '/users/me/stats') return [200, { tradesCompleted: 3, activeItems: 2, activeRoutes: 1 }];
  if (p.startsWith('/ai/')) return [200, { explanation: activeRoute.aiExplanation }];
  return null;
};
