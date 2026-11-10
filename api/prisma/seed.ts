import { ConfigService } from '@nestjs/config';
import {
  ItemCondition,
  ItemStatus,
  PrismaClient,
  RouteStatus,
  StepAcceptance,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AiEmbeddingService } from '../src/modules/ai/services/ai-embedding.service';
import { OpenAiClientService } from '../src/modules/ai/services/openai-client.service';
import { GeoService } from '../src/modules/geo/geo.service';

/**
 * Idempotent demo seed. Every row has a fixed id, so running it again updates in place and
 * never duplicates. The demo network lives in nearby Nariño municipalities and is built so the
 * route engine finds, for Alex Rivera:
 *   - a 2-person cycle  (bicicleta  -> guitarra)
 *   - a 3-person cycle  (audífonos  -> tablet)
 *   - a 4-person cycle  (reloj      -> consola)
 * plus one in-progress proposal (mochila -> parlante) with the participants' acceptances.
 *
 * Required env: DATABASE_URL, SEED_DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * SEED_DEMO_PASSWORD must match VITE_DEMO_PASSWORD in the mobile build.
 */

const prisma = new PrismaClient();
const configService = new ConfigService();
const openAiClient = new OpenAiClientService(configService);
const embeddingService = new AiEmbeddingService(openAiClient);
const geoService = new GeoService();

const BUCKET = 'item-images';
const ASSETS_DIR = join(__dirname, 'seed-assets');
const PROPOSAL_TTL_MS = 48 * 60 * 60 * 1000;
const PROPOSAL_ROUTE_ID = '30000000-0000-4000-8000-000000000001';
const PROPOSAL_CODE = 'SW-4821';

interface SeedUserSpec {
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

interface SeedItemSpec {
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

const uuid = (prefix: number, n: number): string =>
  `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const DEMO_USERS: SeedUserSpec[] = [
  { id: uuid(1, 1), email: 'alex@smartswap.co', name: 'Alex Rivera', initials: 'AR', municipalityCode: '52001', level: 3, rating: 4.9, tradesCompleted: 14, co2SavedKg: 48.5 },
  { id: uuid(1, 2), email: 'valeria@smartswap.co', name: 'Valeria Gómez', initials: 'VG', municipalityCode: '52240', level: 2, rating: 4.8, tradesCompleted: 9, co2SavedKg: 31.2 },
  { id: uuid(1, 3), email: 'mateo@smartswap.co', name: 'Mateo Vargas', initials: 'MV', municipalityCode: '52683', level: 3, rating: 5.0, tradesCompleted: 19, co2SavedKg: 64.0 },
  { id: uuid(1, 4), email: 'camila@smartswap.co', name: 'Camila Torres', initials: 'CT', municipalityCode: '52885', level: 1, rating: 4.7, tradesCompleted: 5, co2SavedKg: 17.8 },
  { id: uuid(1, 5), email: 'diego@smartswap.co', name: 'Diego Santacruz', initials: 'DS', municipalityCode: '52381', level: 2, rating: 4.6, tradesCompleted: 7, co2SavedKg: 22.4 },
  { id: uuid(1, 6), email: 'laura@smartswap.co', name: 'Laura Insuasty', initials: 'LI', municipalityCode: '52207', level: 1, rating: 4.8, tradesCompleted: 4, co2SavedKg: 12.1 },
];

const DEMO_ITEMS: SeedItemSpec[] = [
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
const PROPOSAL_STEPS: Array<{
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function uploadSeedPhoto(fileName: string): Promise<string> {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const objectPath = `seed/${fileName}`;
  const body = await readFile(join(ASSETS_DIR, fileName));

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: new Uint8Array(body),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Photo upload failed for ${fileName} (${response.status}): ${await response.text()}`,
    );
  }
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(requireEnv('SEED_DEMO_PASSWORD'), 10);

  // Network-bound work first so the database transaction stays short.
  const photoUrls = new Map<string, string>();
  for (const fileName of new Set(DEMO_ITEMS.map((item) => item.photo))) {
    photoUrls.set(fileName, await uploadSeedPhoto(fileName));
  }
  const itemEmbeddings = new Map<string, number[]>();
  const wantEmbeddings = new Map<string, number[]>();
  for (const item of DEMO_ITEMS) {
    itemEmbeddings.set(
      item.id,
      await embeddingService.generateEmbedding(`${item.name} ${item.category} ${item.description}`),
    );
    for (const want of item.wants) {
      if (!wantEmbeddings.has(want)) {
        wantEmbeddings.set(want, await embeddingService.generateEmbedding(want));
      }
    }
  }

  const demoUserIds = DEMO_USERS.map((user) => user.id);
  const userIdByEmail = new Map(DEMO_USERS.map((user) => [user.email, user.id]));
  const ownerByEmail = new Map(DEMO_USERS.map((user) => [user.email, user]));
  const demoItemIds = DEMO_ITEMS.map((item) => item.id);
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      // 1. Users (upsert by fixed id; email is unique too).
      for (const spec of DEMO_USERS) {
        const municipality = geoService.requireMunicipality(spec.municipalityCode);
        const data = {
          email: spec.email,
          passwordHash,
          name: spec.name,
          initials: spec.initials,
          avatarUrl: null,
          location: geoService.label(municipality),
          departmentCode: municipality.departmentCode,
          municipalityCode: municipality.code,
          level: spec.level,
          rating: spec.rating,
          tradesCompleted: spec.tradesCompleted,
          co2SavedKg: spec.co2SavedKg,
        };
        const existing = await tx.user.findUnique({ where: { email: spec.email } });
        if (existing && existing.id !== spec.id) {
          // A previous seed generation used other ids for the same emails: keep the row.
          demoUserIds.push(existing.id);
          userIdByEmail.set(spec.email, existing.id);
        }
        await tx.user.upsert({
          where: { email: spec.email },
          update: data,
          create: { id: spec.id, ...data },
        });
      }

      // 2. Drop stale demo state that is not part of this spec (older seed generations).
      await tx.swapRoute.deleteMany({
        where: { initiatorId: { in: demoUserIds }, id: { not: PROPOSAL_ROUTE_ID } },
      });
      await tx.swapRouteStep.deleteMany({ where: { routeId: PROPOSAL_ROUTE_ID } });
      await tx.notification.deleteMany({ where: { userId: { in: demoUserIds } } });
      await tx.want.deleteMany({ where: { userId: { in: demoUserIds } } });
      await tx.item.deleteMany({
        where: { ownerId: { in: demoUserIds }, id: { notIn: demoItemIds } },
      });

      // 3. Items and their wants.
      for (const spec of DEMO_ITEMS) {
        const ownerUser = ownerByEmail.get(spec.ownerEmail);
        const ownerId = userIdByEmail.get(spec.ownerEmail);
        if (!ownerUser || !ownerId) {
          throw new Error(`Owner ${spec.ownerEmail} not found during seeding`);
        }
        const municipality = geoService.requireMunicipality(ownerUser.municipalityCode);
        const imageUrl = photoUrls.get(spec.photo);
        if (!imageUrl) {
          throw new Error(`Photo ${spec.photo} was not uploaded`);
        }
        const embedding = itemEmbeddings.get(spec.id) ?? [];
        const data = {
          ownerId,
          name: spec.name,
          category: spec.category,
          condition: spec.condition,
          description: spec.description,
          estimatedValue: spec.estimatedValue,
          location: geoService.label(municipality),
          departmentCode: municipality.departmentCode,
          municipalityCode: municipality.code,
          status: spec.lockedByProposal ? ItemStatus.PENDING_SWAP : ItemStatus.AVAILABLE,
          images: [imageUrl],
          aiTags: spec.aiTags,
          embedding,
        };
        await tx.item.upsert({
          where: { id: spec.id },
          update: data,
          create: { id: spec.id, ...data },
        });
        await tx.want.createMany({
          data: spec.wants.map((queryText) => ({
            userId: ownerId,
            itemId: spec.id,
            queryText,
            category: null,
            embedding: wantEmbeddings.get(queryText) ?? [],
          })),
        });
      }

      // 4. The in-progress proposal and its notifications.
      const initiatorId = userIdByEmail.get('alex@smartswap.co');
      if (!initiatorId) {
        throw new Error('Initiator alex@smartswap.co not found during seeding');
      }
      const routeData = {
        code: PROPOSAL_CODE,
        initiatorId,
        objectiveText: 'Parlante JBL Flip 5',
        matchScore: 91,
        status: RouteStatus.ACTIVE,
        aiExplanation:
          'Alex entrega su mochila a Mateo, Mateo entrega sus zapatillas a Diego y Diego entrega su parlante a Alex: tres objetos de valor parecido, sin dinero de por medio.',
        co2SavedKg: 8.4,
        expiresAt: new Date(now.getTime() + PROPOSAL_TTL_MS),
      };
      await tx.swapRoute.upsert({
        where: { id: PROPOSAL_ROUTE_ID },
        update: routeData,
        create: { id: PROPOSAL_ROUTE_ID, ...routeData },
      });
      await tx.swapRouteStep.createMany({
        data: PROPOSAL_STEPS.map((step) => ({
          routeId: PROPOSAL_ROUTE_ID,
          stepOrder: step.order,
          userId: userIdByEmail.get(step.email) ?? '',
          givesItemId: step.gives,
          receivesItemId: step.receives,
          acceptance: step.accepted ? StepAcceptance.ACCEPTED : StepAcceptance.PENDING,
          respondedAt: step.accepted ? now : null,
          deliveryConfirmed: false,
        })),
      });
      await tx.notification.createMany({
        data: [
          {
            userId: userIdByEmail.get('mateo@smartswap.co') ?? '',
            type: 'ROUTE_PROPOSAL',
            badge: 'Nueva ruta circular',
            title: `Propuesta de trueque ${PROPOSAL_CODE}`,
            body: `Has sido invitado a una ruta circular de 3 pasos (${PROPOSAL_CODE}) para "Parlante JBL Flip 5". Revisa y responde antes de 48 horas.`,
            read: true,
            routeId: PROPOSAL_ROUTE_ID,
          },
          {
            userId: userIdByEmail.get('diego@smartswap.co') ?? '',
            type: 'ROUTE_PROPOSAL',
            badge: 'Nueva ruta circular',
            title: `Propuesta de trueque ${PROPOSAL_CODE}`,
            body: `Has sido invitado a una ruta circular de 3 pasos (${PROPOSAL_CODE}) para "Parlante JBL Flip 5". Revisa y responde antes de 48 horas.`,
            read: false,
            routeId: PROPOSAL_ROUTE_ID,
          },
        ],
      });
    },
    { timeout: 60_000, maxWait: 15_000 },
  );

  const [users, items, wants, routes, steps, notifications] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: '@smartswap.co' } } }),
    prisma.item.count({ where: { id: { in: demoItemIds } } }),
    prisma.want.count({ where: { userId: { in: demoUserIds } } }),
    prisma.swapRoute.count({ where: { initiatorId: { in: demoUserIds } } }),
    prisma.swapRouteStep.count({ where: { routeId: PROPOSAL_ROUTE_ID } }),
    prisma.notification.count({ where: { userId: { in: demoUserIds } } }),
  ]);
  // eslint-disable-next-line no-console
  console.log(
    `SEED_COUNTS users=${users} items=${items} wants=${wants} routes=${routes} steps=${steps} notifications=${notifications}`,
  );
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Error seeding SmartSwap database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
