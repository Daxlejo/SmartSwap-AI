import { ConfigService } from '@nestjs/config';
import {
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
import { DEMO_ITEMS, DEMO_USERS, PROPOSAL_STEPS, uuid } from '../src/seed/seed-data';

/**
 * Idempotent demo seed. Users, items and the proposal are upserted by fixed id; wants, proposal
 * steps and demo notifications are deleted and recreated on every run, so counts never grow. The demo network lives in nearby Nariño municipalities and is built so the
 * route engine finds, for Alex Rivera:
 *   - a 2-person cycle  (bicicleta  -> guitarra)
 *   - a 3-person cycle  (audífonos  -> tablet)
 *   - a 4-person cycle  (reloj      -> consola)
 * plus one in-progress proposal (mochila -> parlante) with the participants' acceptances.
 *
 * Required env: DATABASE_URL, SEED_DEMO_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * OPENAI_API_KEY is optional: without a real key the embeddings are the local deterministic ones.
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
      // Any other route that still points at a demo item would block its deletion (FK Restrict).
      await tx.swapRoute.deleteMany({
        where: {
          id: { not: PROPOSAL_ROUTE_ID },
          OR: [
            { initiatorId: { in: demoUserIds } },
            { steps: { some: { OR: [{ givesItem: { ownerId: { in: demoUserIds } } }, { receivesItem: { ownerId: { in: demoUserIds } } }] } } },
          ],
        },
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
        const embedding = itemEmbeddings.get(spec.id);
        if (!embedding) {
          throw new Error(`Missing embedding for item ${spec.id}`);
        }
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
          data: spec.wants.map((queryText) => {
            const wantEmbedding = wantEmbeddings.get(queryText);
            if (!wantEmbedding) {
              throw new Error(`Missing embedding for want "${queryText}"`);
            }
            return { userId: ownerId, itemId: spec.id, queryText, category: null, embedding: wantEmbedding };
          }),
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
