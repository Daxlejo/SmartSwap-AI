import { ConfigService } from '@nestjs/config';
import { ItemCondition, ItemStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AiEmbeddingService } from '../src/modules/ai/services/ai-embedding.service';
import { OpenAiClientService } from '../src/modules/ai/services/openai-client.service';
import { GeoService } from '../src/modules/geo/geo.service';

const prisma = new PrismaClient();
const configService = new ConfigService();
const openAiClient = new OpenAiClientService(configService);
const embeddingService = new AiEmbeddingService(openAiClient);
const geoService = new GeoService();

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
  avatarUrl: string;
}

interface SeedItemSpec {
  id: string;
  ownerEmail: string;
  name: string;
  category: string;
  condition: ItemCondition;
  description: string;
  /** Colombian pesos (COP). */
  estimatedValue: number;
  images: string[];
  aiTags: string[];
  wants: string[];
}

const DEMO_USERS: SeedUserSpec[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'alex@smartswap.co',
    name: 'Alex Rivera',
    initials: 'AR',
    municipalityCode: '52001',
    level: 3, // Nivel Oro
    rating: 4.9,
    tradesCompleted: 14,
    co2SavedKg: 48.5,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&q=80',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    email: 'valeria@smartswap.co',
    name: 'Valeria Gómez',
    initials: 'VG',
    municipalityCode: '05001',
    level: 2, // Nivel Plata
    rating: 4.8,
    tradesCompleted: 9,
    co2SavedKg: 31.2,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&q=80',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    email: 'mateo@smartswap.co',
    name: 'Mateo Vargas',
    initials: 'MV',
    municipalityCode: '11001',
    level: 3, // Nivel Oro
    rating: 5.0,
    tradesCompleted: 19,
    co2SavedKg: 64.0,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&q=80',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    email: 'camila@smartswap.co',
    name: 'Camila Torres',
    initials: 'CT',
    municipalityCode: '76001',
    level: 1, // Nivel Bronce
    rating: 4.7,
    tradesCompleted: 5,
    co2SavedKg: 17.8,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&q=80',
  },
];

const DEMO_ITEMS: SeedItemSpec[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    ownerEmail: 'alex@smartswap.co',
    name: 'MacBook Air M1 256GB',
    category: 'Tecnología',
    condition: ItemCondition.NEW, // EXCELLENT
    description:
      'Portátil Apple MacBook Air con chip M1, 8GB RAM y 256GB SSD. Batería al 94%, incluye cargador USB-C original.',
    estimatedValue: 2_600_000,
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80',
    ],
    aiTags: ['macbook', 'laptop', 'apple', 'm1', 'tecnologia', 'portatil'],
    wants: ['Cámara Sony Alpha', 'Bicicleta Gravel', 'iPad Pro'],
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    ownerEmail: 'valeria@smartswap.co',
    name: 'Cámara Sony Alpha a6400 + Lente 16-50mm',
    category: 'Fotografía',
    condition: ItemCondition.LIKE_NEW,
    description:
      'Cámara mirrorless Sony Alpha a6400 grabación 4K con lente kit 16-50mm OSS, correa, batería original y bolso.',
    estimatedValue: 2_720_000,
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80',
    ],
    aiTags: ['camara', 'sony', 'alpha', 'mirrorless', 'fotografia', 'lente'],
    wants: ['Nintendo Switch OLED', 'Sintetizador Roland', 'MacBook Air M1'],
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    ownerEmail: 'mateo@smartswap.co',
    name: 'Nintendo Switch OLED Blanca + Zelda TOTK',
    category: 'Videojuegos',
    condition: ItemCondition.LIKE_NEW,
    description:
      'Consola Nintendo Switch modelo OLED edición blanca con dock, controles Joy-Con impecables y juego físico Zelda Tears of the Kingdom.',
    estimatedValue: 1_360_000,
    images: [
      'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=900&q=80',
    ],
    aiTags: ['nintendo', 'switch', 'oled', 'consola', 'videojuegos', 'gaming'],
    wants: ['Monitor Ultrawide LG', 'MacBook Air M1'],
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    ownerEmail: 'mateo@smartswap.co',
    name: 'Bicicleta Gravel Specialized Diverge',
    category: 'Deportes',
    condition: ItemCondition.NEW, // EXCELLENT
    description:
      'Bicicleta gravel Specialized Diverge cuadro de aluminio ligero, horquilla de carbono y transmisión Shimano Claris recién ajustada.',
    estimatedValue: 2_760_000,
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&q=80',
    ],
    aiTags: ['bicicleta', 'gravel', 'specialized', 'ciclismo', 'deportes', 'ruta'],
    wants: ['Monitor Ultrawide LG', 'MacBook Air M1'],
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    ownerEmail: 'camila@smartswap.co',
    name: 'Monitor Ultrawide LG 34 pulgadas WQHD',
    category: 'Tecnología',
    condition: ItemCondition.LIKE_NEW,
    description:
      'Monitor curvo UltraWide LG de 34 pulgadas resolución WQHD (3440x1440), panel IPS HDR10 ideal para diseño y multitarea.',
    estimatedValue: 2_560_000,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=900&q=80',
    ],
    aiTags: ['monitor', 'ultrawide', 'lg', 'display', 'setup', 'tecnologia'],
    wants: ['Cámara Sony Alpha', 'Bicicleta Gravel'],
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('SmartSwap2026!', 10);
  const userByEmail = new Map<string, string>();

  const municipalityByUserId = new Map<
    string,
    ReturnType<GeoService['requireMunicipality']>
  >();

  for (const userSpec of DEMO_USERS) {
    const municipality = geoService.requireMunicipality(userSpec.municipalityCode);
    const user = await prisma.user.upsert({
      where: { email: userSpec.email },
      update: {
        name: userSpec.name,
        initials: userSpec.initials,
        location: geoService.label(municipality),
        departmentCode: municipality.departmentCode,
        municipalityCode: municipality.code,
        level: userSpec.level,
        rating: userSpec.rating,
        tradesCompleted: userSpec.tradesCompleted,
        co2SavedKg: userSpec.co2SavedKg,
        avatarUrl: userSpec.avatarUrl,
        passwordHash,
      },
      create: {
        id: userSpec.id,
        email: userSpec.email,
        passwordHash,
        name: userSpec.name,
        initials: userSpec.initials,
        location: geoService.label(municipality),
        departmentCode: municipality.departmentCode,
        municipalityCode: municipality.code,
        level: userSpec.level,
        rating: userSpec.rating,
        tradesCompleted: userSpec.tradesCompleted,
        co2SavedKg: userSpec.co2SavedKg,
        avatarUrl: userSpec.avatarUrl,
      },
    });

    userByEmail.set(userSpec.email, user.id);
    municipalityByUserId.set(user.id, municipality);
  }

  for (const itemSpec of DEMO_ITEMS) {
    const ownerId = userByEmail.get(itemSpec.ownerEmail);
    if (!ownerId) {
      throw new Error(`Owner ${itemSpec.ownerEmail} not found during seeding`);
    }

    const ownerMunicipality = municipalityByUserId.get(ownerId);
    if (!ownerMunicipality) {
      throw new Error(`Municipality for owner ${itemSpec.ownerEmail} not resolved`);
    }
    const itemLocation = {
      location: geoService.label(ownerMunicipality),
      departmentCode: ownerMunicipality.departmentCode,
      municipalityCode: ownerMunicipality.code,
    };

    const itemEmbedding = await embeddingService.generateEmbedding(
      `${itemSpec.name} ${itemSpec.category} ${itemSpec.description}`,
    );

    const upsertedItem = await prisma.item.upsert({
      where: { id: itemSpec.id },
      update: {
        ownerId,
        name: itemSpec.name,
        category: itemSpec.category,
        condition: itemSpec.condition,
        description: itemSpec.description,
        estimatedValue: itemSpec.estimatedValue,
        ...itemLocation,
        status: ItemStatus.AVAILABLE,
        images: itemSpec.images,
        aiTags: itemSpec.aiTags,
        embedding: itemEmbedding,
      },
      create: {
        id: itemSpec.id,
        ownerId,
        name: itemSpec.name,
        category: itemSpec.category,
        condition: itemSpec.condition,
        description: itemSpec.description,
        estimatedValue: itemSpec.estimatedValue,
        ...itemLocation,
        status: ItemStatus.AVAILABLE,
        images: itemSpec.images,
        aiTags: itemSpec.aiTags,
        embedding: itemEmbedding,
      },
    });

    await prisma.want.deleteMany({
      where: { itemId: upsertedItem.id },
    });

    const wantsData = await Promise.all(
      itemSpec.wants.map(async (wantText) => {
        const cleanWant = wantText.trim();
        const wantEmbedding =
          await embeddingService.generateEmbedding(cleanWant);
        return {
          userId: ownerId,
          itemId: upsertedItem.id,
          queryText: cleanWant,
          category: itemSpec.category,
          embedding: wantEmbedding,
        };
      }),
    );

    await prisma.want.createMany({
      data: wantsData,
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `SmartSwap seed completed: ${DEMO_USERS.length} users and ${DEMO_ITEMS.length} circular barter items seeded.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error seeding SmartSwap database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
