import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorageService: SupabaseStorageService,
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

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit;
    const skip = limit ? (page - 1) * limit : undefined;

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
    const resolvedImages = await this.resolveImages(userId, dto.images);
    const resolvedLocation = await this.resolveLocation(userId, dto.location);
    const prismaCondition = toPrismaItemCondition(dto.condition);
    const normalizedWants = dto.wants.map((want) => want.trim());

    const createdItem = await this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          ownerId: userId,
          name: dto.name.trim(),
          category: dto.category.trim(),
          condition: prismaCondition,
          description: dto.description.trim(),
          estimatedValue: dto.estimatedValue,
          location: resolvedLocation,
          images: resolvedImages,
        },
      });

      if (normalizedWants.length > 0) {
        await tx.want.createMany({
          data: normalizedWants.map((queryText) => ({
            userId,
            itemId: item.id,
            queryText,
            category: dto.category.trim(),
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

    const resolvedImages =
      dto.images !== undefined
        ? await this.resolveImages(userId, dto.images)
        : undefined;

    const updateData: Prisma.ItemUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.category !== undefined) {
      updateData.category = dto.category.trim();
    }
    if (dto.condition !== undefined) {
      updateData.condition = toPrismaItemCondition(dto.condition);
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
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

    const updatedItem = await this.prisma.$transaction(async (tx) => {
      if (dto.wants !== undefined) {
        await tx.want.deleteMany({
          where: { itemId },
        });

        const normalizedWants = dto.wants.map((want) => want.trim());
        if (normalizedWants.length > 0) {
          await tx.want.createMany({
            data: normalizedWants.map((queryText) => ({
              userId,
              itemId,
              queryText,
              category: dto.category?.trim() ?? existingItem.category,
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

    await this.prisma.$transaction(async (tx) => {
      await tx.want.deleteMany({
        where: { itemId },
      });

      await tx.item.delete({
        where: { id: itemId },
      });
    });

    return {
      deleted: true,
      id: itemId,
    };
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
