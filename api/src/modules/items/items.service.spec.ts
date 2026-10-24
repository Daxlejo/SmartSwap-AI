import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemCondition, ItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';
import { SupabaseStorageService } from './storage/supabase-storage.service';

describe('ItemsService', () => {
  let itemsService: ItemsService;
  let supabaseStorageService: jest.Mocked<
    Pick<SupabaseStorageService, 'uploadBase64Image'>
  >;

  const ownerId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const itemId = '33333333-3333-4333-8333-333333333333';

  const mockCreatedEntity = {
    id: itemId,
    ownerId,
    name: 'Sony WH-1000XM5',
    category: 'Audio',
    condition: ItemCondition.LIKE_NEW,
    description: 'Noise cancelling headphones in mint condition with case.',
    estimatedValue: 1200000,
    location: 'Medellín',
    status: ItemStatus.AVAILABLE,
    images: [
      'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/photo.jpg',
    ],
    aiTags: ['audio', 'headphones'],
    embedding: [],
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
    updatedAt: new Date('2026-10-24T12:00:00.000Z'),
    owner: {
      id: ownerId,
      name: 'Camila Restrepo',
      initials: 'CR',
      rating: 4.9,
      location: 'Medellín',
    },
    wants: [
      { queryText: 'iPad Air' },
      { queryText: 'Nintendo Switch OLED' },
    ],
  };

  const mockTx = {
    item: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    want: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(
      async <T>(callback: (tx: typeof mockTx) => Promise<T>): Promise<T> =>
        callback(mockTx),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    supabaseStorageService = {
      uploadBase64Image: jest.fn().mockResolvedValue({
        url: 'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/uploaded.jpg',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SupabaseStorageService,
          useValue: supabaseStorageService,
        },
      ],
    }).compile();

    itemsService = module.get<ItemsService>(ItemsService);
  });

  describe('create', () => {
    it('should create an item, upload base64 images via SupabaseStorageService, and synchronize Want records inside a transaction', async () => {
      const createDto: CreateItemDto = {
        name: 'Sony WH-1000XM5',
        category: 'Audio',
        condition: 'LIKE_NEW',
        description: 'Noise cancelling headphones in mint condition with case.',
        estimatedValue: 1200000,
        location: 'Medellín',
        images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
        wants: ['iPad Air', 'Nintendo Switch OLED'],
      };

      mockTx.item.create.mockResolvedValue({
        ...mockCreatedEntity,
        images: [
          'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/uploaded.jpg',
        ],
      });
      mockTx.want.createMany.mockResolvedValue({ count: 2 });
      mockTx.item.findUniqueOrThrow.mockResolvedValue({
        ...mockCreatedEntity,
        images: [
          'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/uploaded.jpg',
        ],
      });

      const result = await itemsService.create(ownerId, createDto);

      expect(supabaseStorageService.uploadBase64Image).toHaveBeenCalledWith(
        ownerId,
        'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      );
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.item.create).toHaveBeenCalledWith({
        data: {
          ownerId,
          name: 'Sony WH-1000XM5',
          category: 'Audio',
          condition: ItemCondition.LIKE_NEW,
          description:
            'Noise cancelling headphones in mint condition with case.',
          estimatedValue: 1200000,
          location: 'Medellín',
          images: [
            'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/uploaded.jpg',
          ],
        },
      });
      expect(mockTx.want.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: ownerId,
            itemId,
            queryText: 'iPad Air',
            category: 'Audio',
          },
          {
            userId: ownerId,
            itemId,
            queryText: 'Nintendo Switch OLED',
            category: 'Audio',
          },
        ],
      });
      expect(result).toMatchObject({
        id: itemId,
        ownerId,
        ownerName: 'Camila Restrepo',
        ownerInitials: 'CR',
        condition: 'LIKE_NEW',
        conditionLabel: 'Como nuevo',
        status: 'ACTIVE',
        wants: ['iPad Air', 'Nintendo Switch OLED'],
      });
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when a non-owner attempts to update an item', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockCreatedEntity);

      const updateDto: UpdateItemDto = {
        name: 'Unauthorized Rename',
      };

      await expect(
        itemsService.update(otherUserId, itemId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should replace Want records and update the item when called by the owner', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockCreatedEntity);
      mockTx.want.deleteMany.mockResolvedValue({ count: 2 });
      mockTx.want.createMany.mockResolvedValue({ count: 1 });
      mockTx.item.update.mockResolvedValue({
        ...mockCreatedEntity,
        name: 'Sony WH-1000XM5 Black',
        wants: [{ queryText: 'MacBook Air M1' }],
      });

      const updateDto: UpdateItemDto = {
        name: 'Sony WH-1000XM5 Black',
        wants: ['MacBook Air M1'],
      };

      const result = await itemsService.update(ownerId, itemId, updateDto);

      expect(mockTx.want.deleteMany).toHaveBeenCalledWith({
        where: { itemId },
      });
      expect(mockTx.want.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: ownerId,
            itemId,
            queryText: 'MacBook Air M1',
            category: 'Audio',
          },
        ],
      });
      expect(result.name).toBe('Sony WH-1000XM5 Black');
      expect(result.wants).toEqual(['MacBook Air M1']);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when a non-owner attempts to delete an item', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockCreatedEntity);

      await expect(itemsService.remove(otherUserId, itemId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when attempting to delete a non-existent item', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(itemsService.remove(ownerId, 'missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete associated wants and the item inside a transaction when called by the owner', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockCreatedEntity);
      mockTx.want.deleteMany.mockResolvedValue({ count: 2 });
      mockTx.item.delete.mockResolvedValue(mockCreatedEntity);

      const result = await itemsService.remove(ownerId, itemId);

      expect(mockTx.want.deleteMany).toHaveBeenCalledWith({
        where: { itemId },
      });
      expect(mockTx.item.delete).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(result).toEqual({ deleted: true, id: itemId });
    });
  });
});
