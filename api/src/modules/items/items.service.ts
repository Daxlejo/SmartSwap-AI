import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEmbeddingService } from '../ai/services/ai-embedding.service';
import { GeoService } from '../geo/geo.service';
import { NEARBY_RADIUS_KM } from '../geo/geo.types';
import {
  CreateItemDto,
  toPrismaItemCondition,
} from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import {
  UpdateItemDto,
  toPrismaItemStatus,
} from './dto/update-item.dto';
import {
  ItemMapper,
  ItemResponseDto,
  ItemWithRelations,
} from './mappers/item.mapper';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { normalizeItemTitle } from './item-title';
import { cosineSimilarity } from '../ai/services/ai-embedding.service';
import { SimilarItemsQueryDto } from './dto/similar-items.dto';

/** Same bar the route engine uses to accept a want as semantically matched. */
export const SIMILAR_ITEMS_MIN_SCORE = 0.42;
const SIMILAR_ITEMS_DEFAULT_LIMIT = 6;
/**
 * Most recent rows read when filtering, sorting or ranking in memory. Keeps one request
 * bounded; with a larger catalog this belongs in the database (unaccent, pgvector).
 */
export const MAX_IN_MEMORY_ROWS = 500;

/** Whether a normalized search term appears in the item's name, description or category. */
const matchesSearchTerm = (
  item: { name: string; description: string | null; category: string },
  normalizedTerm: string,
): boolean =>
  [item.name, item.description ?? '', item.category].some((text) =>
    normalizeItemTitle(text).includes(normalizedTerm),
  );

/** 409 of POST /items when the same title is already reserved in a swap in progress. */
export const ITEM_ALREADY_IN_SWAP_MESSAGE =
  'You already have an item with this title in a swap in progress';

const ITEM_RELATIONS_INCLUDE = {
  owner: {
    select: {
      id: true,
      name: true,
      initials: true,
      rating: true,
      location: true,
    },
  },
  wants: {
    select: {
      queryText: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.ItemInclude;

const STOP_WORDS = new Set([
  'con',
  'sin',
  'para',
  'por',
  'una',
  'uno',
  'los',
  'las',
  'del',
  'que',
  'como',
  'muy',
  'mas',
  'este',
  'esta',
  'the',
  'and',
  'for',
  'with',
]);

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly aiEmbeddingService: AiEmbeddingService,
    private readonly geoService: GeoService,
  ) {}

  async findAll(query: QueryItemsDto = {}): Promise<ItemResponseDto[]> {
    const where: Prisma.ItemWhereInput = {};

    const viewer = this.resolveViewer(query);
    const scope = query.scope ?? 'country';
    if (viewer && scope === 'nearby') {
      where.municipalityCode = {
        in: this.geoService
          .municipalitiesWithin(viewer.code, query.radiusKm ?? NEARBY_RADIUS_KM)
          .map((entry) => entry.code),
      };
    } else if (viewer && scope === 'department') {
      where.departmentCode = viewer.departmentCode;
    }

    const effectiveStatus = query.status?.trim() || 'ACTIVE';
    if (effectiveStatus.toUpperCase() !== 'ALL') {
      where.status = toPrismaItemStatus(effectiveStatus);
    }

    if (query.category) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.ownerId) {
      where.ownerId = query.ownerId.trim();
    } else if (query.excludeOwnerId) {
      where.ownerId = { not: query.excludeOwnerId };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.estimatedValue = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    // Text search ignores case, accents and extra spaces ("camara" finds "Cámara"), so it runs
    // in memory over the rows the other filters already narrowed, like the nearest-first sort.
    const searchTerm = normalizeItemTitle(query.search || query.query || '');

    const page = query.page ?? 1;
    const limit = query.limit;
    const skip =
      query.offset !== undefined
        ? query.offset
        : limit
          ? (page - 1) * limit
          : undefined;

    if (viewer || searchTerm) {
      const rows = await this.prisma.item.findMany({
        where,
        include: ITEM_RELATIONS_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: MAX_IN_MEMORY_ROWS,
      });
      const found = searchTerm
        ? rows.filter((row) => matchesSearchTerm(row, searchTerm))
        : rows;
      const start = skip ?? 0;
      if (!viewer) {
        const list = ItemMapper.toResponseList(found as ItemWithRelations[]);
        return limit !== undefined ? list.slice(start, start + limit) : list;
      }
      // Nearest first: distance is not a database column either.
      const withDistance = ItemMapper.toResponseList(found as ItemWithRelations[]).map(
        (dto) => ({
          ...dto,
          distanceKm: dto.municipalityCode
            ? this.roundDistance(this.geoService.distanceKm(viewer.code, dto.municipalityCode))
            : null,
        }),
      );
      withDistance.sort(
        (a, b) =>
          (a.distanceKm ?? Number.POSITIVE_INFINITY) -
          (b.distanceKm ?? Number.POSITIVE_INFINITY),
      );
      return limit !== undefined ? withDistance.slice(start, start + limit) : withDistance;
    }

    const items = await this.prisma.item.findMany({
      where,
      include: ITEM_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...(limit !== undefined ? { skip, take: limit } : {}),
    });

    return ItemMapper.toResponseList(items as ItemWithRelations[]);
  }

  /**
   * Fallback of an empty text search: active items of other users whose embedding is close to
   * the query's, most similar first. Below the threshold an item is noise and is left out.
   */
  async findSimilar(
    userId: string,
    query: SimilarItemsQueryDto,
  ): Promise<ItemResponseDto[]> {
    const queryEmbedding = await this.aiEmbeddingService.generateEmbedding(query.q);
    if (queryEmbedding.every((value) => value === 0)) {
      return [];
    }
    const rows = await this.prisma.item.findMany({
      where: { status: ItemStatus.AVAILABLE, ownerId: { not: userId } },
      include: ITEM_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: MAX_IN_MEMORY_ROWS,
    });
    const ranked = rows
      .map((row) => ({
        row,
        score: cosineSimilarity(queryEmbedding, row.embedding ?? []),
      }))
      .filter(({ score }) => score >= SIMILAR_ITEMS_MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit ?? SIMILAR_ITEMS_DEFAULT_LIMIT);
    return ItemMapper.toResponseList(ranked.map(({ row }) => row) as ItemWithRelations[]);
  }

  async findMine(userId: string): Promise<ItemResponseDto[]> {
    const items = await this.prisma.item.findMany({
      where: { ownerId: userId },
      include: ITEM_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return ItemMapper.toResponseList(items as ItemWithRelations[]);
  }

  async findByIdOrThrow(id: string): Promise<ItemResponseDto> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: ITEM_RELATIONS_INCLUDE,
    });

    if (!item) {
      throw new NotFoundException(`Item with ID "${id}" not found`);
    }

    return ItemMapper.toResponse(item as ItemWithRelations);
  }

  async uploadImage(
    userId: string,
    imageBase64: string,
    mimeType?: string,
  ): Promise<{ url: string }> {
    return this.supabaseStorageService.uploadBase64Image(
      userId,
      imageBase64,
      mimeType,
    );
  }

  async create(
    userId: string,
    dto: CreateItemDto,
  ): Promise<ItemResponseDto> {
    const trimmedName = dto.name.trim();
    const trimmedCategory = dto.category.trim();
    const trimmedDescription = dto.description.trim();

    // Checked first, so a repeated post costs no inline image upload or embedding (the app
    // uploads photos beforehand, so it runs the same check on its side before uploading)
    await this.assertNotAlreadyInSwap(userId, trimmedName);

    const resolvedImages = await this.resolveImages(userId, dto.images);
    const resolvedLocation = await this.resolveLocation(
      userId,
      dto.location,
      dto.municipalityCode,
    );
    const prismaCondition = toPrismaItemCondition(dto.condition);
    const normalizedWants = dto.wants.map((want) => want.trim());

    const itemEmbedding = await this.aiEmbeddingService.generateEmbedding(
      `${trimmedName} ${trimmedCategory} ${trimmedDescription}`,
    );

    const aiTags =
      dto.aiTags && dto.aiTags.length > 0
        ? dto.aiTags.map((t) => t.trim().toLowerCase()).filter(Boolean)
        : this.deriveAiTags(trimmedName, trimmedCategory, trimmedDescription);

    const wantsWithEmbeddings = await Promise.all(
      normalizedWants.map(async (queryText) => ({
        queryText,
        embedding: await this.aiEmbeddingService.generateEmbedding(queryText),
      })),
    );

    const createdItem = await this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          ownerId: userId,
          name: trimmedName,
          category: trimmedCategory,
          condition: prismaCondition,
          description: trimmedDescription,
          estimatedValue: dto.estimatedValue,
          location: resolvedLocation.location,
          departmentCode: resolvedLocation.departmentCode,
          municipalityCode: resolvedLocation.municipalityCode,
          images: resolvedImages,
          aiTags,
          embedding: itemEmbedding,
        },
      });

      if (wantsWithEmbeddings.length > 0) {
        await tx.want.createMany({
          data: wantsWithEmbeddings.map(({ queryText, embedding }) => ({
            userId,
            itemId: item.id,
            queryText,
            category: trimmedCategory,
            embedding,
          })),
        });
      }

      return tx.item.findUniqueOrThrow({
        where: { id: item.id },
        include: ITEM_RELATIONS_INCLUDE,
      });
    });

    return ItemMapper.toResponse(createdItem as ItemWithRelations);
  }

  /**
   * Business rule: a user cannot publish again an item whose title (normalized with
   * `normalizeItemTitle`) matches one of theirs that is reserved in a swap in progress
   * (PENDING_SWAP or RESERVED); that would offer the same object twice. An AVAILABLE duplicate is
   * allowed: the app only warns about it. Known limit: titles are compared, not objects,
   * so the same object under another name passes.
   */
  private async assertNotAlreadyInSwap(userId: string, name: string): Promise<void> {
    const reserved = await this.prisma.item.findMany({
      where: { ownerId: userId, status: { in: [ItemStatus.PENDING_SWAP, ItemStatus.RESERVED] } },
      select: { name: true },
    });
    const title = normalizeItemTitle(name);
    if (reserved.some((item) => normalizeItemTitle(item.name) === title)) {
      throw new ConflictException(ITEM_ALREADY_IN_SWAP_MESSAGE);
    }
  }

  async update(
    userId: string,
    itemId: string,
    dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    const existingItem = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      throw new NotFoundException(`Item with ID "${itemId}" not found`);
    }

    if (existingItem.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this item',
      );
    }

    if (dto.status !== undefined && this.isLockedInSwap(existingItem.status)) {
      throw new ConflictException(
        'Cannot change the status of an item that is locked in a swap route',
      );
    }

    const resolvedImages =
      dto.images !== undefined
        ? await this.resolveImages(userId, dto.images)
        : undefined;

    const updateData: Prisma.ItemUpdateInput = {};

    const nextName = dto.name?.trim() ?? existingItem.name;
    const nextCategory = dto.category?.trim() ?? existingItem.category;
    const nextDescription =
      dto.description?.trim() ?? existingItem.description ?? '';

    if (dto.name !== undefined) {
      updateData.name = nextName;
    }
    if (dto.category !== undefined) {
      updateData.category = nextCategory;
    }
    if (dto.condition !== undefined) {
      updateData.condition = toPrismaItemCondition(dto.condition);
    }
    if (dto.description !== undefined) {
      updateData.description = nextDescription;
    }
    if (dto.estimatedValue !== undefined) {
      updateData.estimatedValue = dto.estimatedValue;
    }
    if (dto.location !== undefined) {
      updateData.location = dto.location.trim();
    }
    if (resolvedImages !== undefined) {
      updateData.images = resolvedImages;
    }
    if (dto.status !== undefined) {
      updateData.status = toPrismaItemStatus(dto.status);
    }

    const shouldRecomputeSemantics =
      dto.name !== undefined ||
      dto.category !== undefined ||
      dto.description !== undefined ||
      !Array.isArray(existingItem.embedding) ||
      existingItem.embedding.length === 0;

    if (shouldRecomputeSemantics) {
      updateData.embedding = await this.aiEmbeddingService.generateEmbedding(
        `${nextName} ${nextCategory} ${nextDescription}`,
      );
      if (dto.aiTags !== undefined) {
        updateData.aiTags = dto.aiTags
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      } else if (
        !Array.isArray(existingItem.aiTags) ||
        existingItem.aiTags.length === 0 ||
        dto.name !== undefined ||
        dto.category !== undefined
      ) {
        updateData.aiTags = this.deriveAiTags(
          nextName,
          nextCategory,
          nextDescription,
        );
      }
    } else if (dto.aiTags !== undefined) {
      updateData.aiTags = dto.aiTags
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

    const wantsWithEmbeddings =
      dto.wants !== undefined
        ? await Promise.all(
            dto.wants.map(async (rawWant) => {
              const queryText = rawWant.trim();
              return {
                queryText,
                embedding:
                  await this.aiEmbeddingService.generateEmbedding(queryText),
              };
            }),
          )
        : undefined;

    const updatedItem = await this.prisma.$transaction(async (tx) => {
      if (wantsWithEmbeddings !== undefined) {
        await tx.want.deleteMany({
          where: { itemId },
        });

        if (wantsWithEmbeddings.length > 0) {
          await tx.want.createMany({
            data: wantsWithEmbeddings.map(({ queryText, embedding }) => ({
              userId,
              itemId,
              queryText,
              category: nextCategory,
              embedding,
            })),
          });
        }
      }

      return tx.item.update({
        where: { id: itemId },
        data: updateData,
        include: ITEM_RELATIONS_INCLUDE,
      });
    });

    return ItemMapper.toResponse(updatedItem as ItemWithRelations);
  }

  async remove(
    userId: string,
    itemId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const existingItem = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      throw new NotFoundException(`Item with ID "${itemId}" not found`);
    }

    if (existingItem.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this item',
      );
    }

    if (this.isLockedInSwap(existingItem.status)) {
      throw new ConflictException(
        'Cannot delete an item that is locked in a swap route',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.want.deleteMany({
        where: { itemId },
      });

      // Route steps reference items with onDelete: Restrict, so items with swap history are archived instead.
      const routeStepsCount = await tx.swapRouteStep.count({
        where: {
          OR: [{ givesItemId: itemId }, { receivesItemId: itemId }],
        },
      });

      if (routeStepsCount > 0) {
        await tx.item.update({
          where: { id: itemId },
          data: { status: ItemStatus.ARCHIVED },
        });
        return;
      }

      await tx.item.delete({
        where: { id: itemId },
      });
    });

    return {
      deleted: true,
      id: itemId,
    };
  }

  private isLockedInSwap(status: ItemStatus): boolean {
    return (
      status === ItemStatus.PENDING_SWAP ||
      status === ItemStatus.RESERVED ||
      status === ItemStatus.SWAPPED
    );
  }

  private deriveAiTags(
    name: string,
    category: string,
    description: string,
  ): string[] {
    const combined = `${category} ${name} ${description}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');

    const tokens = combined
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

    return Array.from(new Set(tokens)).slice(0, 6);
  }

  private async resolveImages(
    userId: string,
    images: string[],
  ): Promise<string[]> {
    return Promise.all(
      images.map(async (imageEntry) => {
        const trimmed = imageEntry.trim();
        if (trimmed.startsWith('data:image/')) {
          const uploaded = await this.supabaseStorageService.uploadBase64Image(
            userId,
            trimmed,
          );
          return uploaded.url;
        }
        return trimmed;
      }),
    );
  }

  /**
   * An item is located where it is published: the municipality sent with the item, otherwise the
   * owner's own municipality.
   */
  private async resolveLocation(
    userId: string,
    explicitLocation?: string,
    explicitMunicipalityCode?: string,
  ): Promise<{
    location: string;
    departmentCode: string | null;
    municipalityCode: string | null;
  }> {
    if (explicitMunicipalityCode) {
      const municipality = this.geoService.requireMunicipality(explicitMunicipalityCode);
      return {
        location: this.geoService.label(municipality),
        departmentCode: municipality.departmentCode,
        municipalityCode: municipality.code,
      };
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { location: true, departmentCode: true, municipalityCode: true },
    });

    return {
      location: explicitLocation?.trim() || owner?.location?.trim() || 'Colombia',
      departmentCode: owner?.departmentCode ?? null,
      municipalityCode: owner?.municipalityCode ?? null,
    };
  }

  private resolveViewer(query: QueryItemsDto) {
    if (!query.municipalityCode) {
      if (query.scope && query.scope !== 'country') {
        throw new BadRequestException(
          `municipalityCode is required for the "${query.scope}" scope`,
        );
      }
      return undefined;
    }
    return this.geoService.requireMunicipality(query.municipalityCode);
  }

  private roundDistance(distanceKm: number | null): number | null {
    return distanceKm === null ? null : Math.round(distanceKm * 10) / 10;
  }
}
