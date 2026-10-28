import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEmbeddingService } from '../ai/services/ai-embedding.service';
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
import { SupabaseStorageService } from './storage/supabase-storage.service';

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
  ) {}

  async findAll(query: QueryItemsDto = {}): Promise<ItemResponseDto[]> {
    const where: Prisma.ItemWhereInput = {};

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
    }

    const rawSearch = query.search || query.query;
    if (rawSearch) {
      const searchTerm = rawSearch.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit;
    const skip =
      query.offset !== undefined
        ? query.offset
        : limit
          ? (page - 1) * limit
          : undefined;

    const items = await this.prisma.item.findMany({
      where,
      include: ITEM_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...(limit !== undefined ? { skip, take: limit } : {}),
    });

    return ItemMapper.toResponseList(items as ItemWithRelations[]);
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

    const resolvedImages = await this.resolveImages(userId, dto.images);
    const resolvedLocation = await this.resolveLocation(userId, dto.location);
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
          location: resolvedLocation,
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
    return status === ItemStatus.PENDING_SWAP || status === ItemStatus.SWAPPED;
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

  private async resolveLocation(
    userId: string,
    explicitLocation?: string,
  ): Promise<string> {
    if (explicitLocation && explicitLocation.trim().length > 0) {
      return explicitLocation.trim();
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { location: true },
    });

    return owner?.location?.trim() || 'Colombia';
  }
}
