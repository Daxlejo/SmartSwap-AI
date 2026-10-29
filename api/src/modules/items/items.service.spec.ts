import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemCondition, ItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEmbeddingService } from '../ai/services/ai-embedding.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GeoService } from '../geo/geo.service';
import { ItemsService } from './items.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

describe('ItemsService', () => {
  let itemsService: ItemsService;
  let supabaseStorageService: jest.Mocked<
    Pick<SupabaseStorageService, 'uploadBase64Image'>
  >;
  let aiEmbeddingService: jest.Mocked<
    Pick<AiEmbeddingService, 'generateEmbedding'>
  >;

  const ownerId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const itemId = '33333333-3333-4333-8333-333333333333';
  const mockEmbedding = [0.5, 0.5, 0.5, 0.5];

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
    aiTags: ['audio', 'sony', '1000xm5', 'noise', 'cancelling', 'headphones'],
    embedding: mockEmbedding,
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
    swapRouteStep: {
      count: jest.fn().mockResolvedValue(0),
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

    aiEmbeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue(mockEmbedding),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        GeoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SupabaseStorageService,
          useValue: supabaseStorageService,
        },
        {
          provide: AiEmbeddingService,
          useValue: aiEmbeddingService,
        },
      ],
    }).compile();

    itemsService = module.get<ItemsService>(ItemsService);
  });

  describe('create', () => {
    it('should create an item, upload base64 images, generate embeddings & aiTags, and synchronize Want records inside a transaction', async () => {
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
      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Sony WH-1000XM5 Audio Noise cancelling headphones in mint condition with case.',
      );
      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'iPad Air',
      );
      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Nintendo Switch OLED',
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
          departmentCode: null,
          municipalityCode: null,
          images: [
            'https://smartswap-mock.supabase.co/storage/v1/object/public/item-images/111/uploaded.jpg',
          ],
          aiTags: ['audio', 'sony', '1000xm5', 'noise', 'cancelling', 'headphones'],
          embedding: mockEmbedding,
        },
      });
      expect(mockTx.want.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: ownerId,
            itemId,
            queryText: 'iPad Air',
            category: 'Audio',
            embedding: mockEmbedding,
          },
          {
            userId: ownerId,
            itemId,
            queryText: 'Nintendo Switch OLED',
            category: 'Audio',
            embedding: mockEmbedding,
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

  describe('location', () => {
    const locatedItem = (id: string, municipalityCode: string, departmentCode: string) => ({
      ...mockCreatedEntity,
      id,
      municipalityCode,
      departmentCode,
    });

    it('publishes an item in the owner municipality when none is sent', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        location: 'Pasto, Nariño',
        departmentCode: '52',
        municipalityCode: '52001',
      });
      mockTx.item.create.mockResolvedValue(mockCreatedEntity);
      mockTx.want.createMany.mockResolvedValue({ count: 1 });
      mockTx.item.findUniqueOrThrow.mockResolvedValue(mockCreatedEntity);

      await itemsService.create(ownerId, {
        name: 'Bicicleta',
        category: 'Deportes',
        condition: 'GOOD',
        description: 'Bicicleta de montaña',
        estimatedValue: 900000,
        images: ['https://example.com/bike.jpg'],
        wants: ['Cámara'],
      });

      expect(mockTx.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Pasto, Nariño',
          departmentCode: '52',
          municipalityCode: '52001',
        }),
      });
    });

    it('lets an item be published in a different municipality than the owner', async () => {
      mockTx.item.create.mockResolvedValue(mockCreatedEntity);
      mockTx.want.createMany.mockResolvedValue({ count: 1 });
      mockTx.item.findUniqueOrThrow.mockResolvedValue(mockCreatedEntity);

      await itemsService.create(ownerId, {
        name: 'Bicicleta',
        category: 'Deportes',
        condition: 'GOOD',
        description: 'Bicicleta de montaña',
        estimatedValue: 900000,
        municipalityCode: '05001',
        images: ['https://example.com/bike.jpg'],
        wants: ['Cámara'],
      });

      expect(mockTx.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Medellín, Antioquia',
          municipalityCode: '05001',
        }),
      });
    });

    it('restricts the nearby scope to municipalities within the radius and sorts nearest first', async () => {
      mockPrismaService.item.findMany.mockResolvedValue([
        locatedItem('ipiales-item', '52356', '52'),
        locatedItem('pasto-item', '52001', '52'),
      ]);

      const result = await itemsService.findAll({
        scope: 'nearby',
        municipalityCode: '52001',
        radiusKm: 70,
      });

      const where = mockPrismaService.item.findMany.mock.calls[0][0].where;
      expect(where.municipalityCode.in).toEqual(
        expect.arrayContaining(['52001', '52356']),
      );
      expect(where.municipalityCode.in).not.toContain('19001');
      expect(result.map((item) => item.id)).toEqual(['pasto-item', 'ipiales-item']);
      expect(result[0].distanceKm).toBe(0);
      expect(result[1].distanceKm).toBeGreaterThan(50);
    });

    it('restricts the department scope to the viewer department', async () => {
      mockPrismaService.item.findMany.mockResolvedValue([]);

      await itemsService.findAll({ scope: 'department', municipalityCode: '52001' });

      expect(mockPrismaService.item.findMany.mock.calls[0][0].where.departmentCode).toBe('52');
    });

    it('does not filter by location in the country scope but still reports distances', async () => {
      mockPrismaService.item.findMany.mockResolvedValue([
        locatedItem('medellin-item', '05001', '05'),
      ]);

      const result = await itemsService.findAll({
        scope: 'country',
        municipalityCode: '52001',
      });

      const where = mockPrismaService.item.findMany.mock.calls[0][0].where;
      expect(where.municipalityCode).toBeUndefined();
      expect(where.departmentCode).toBeUndefined();
      expect(result[0].distanceKm).toBeGreaterThan(500);
    });

    it('requires the viewer municipality for the nearby and department scopes', async () => {
      await expect(itemsService.findAll({ scope: 'nearby' })).rejects.toThrow(
        'municipalityCode is required',
      );
      expect(mockPrismaService.item.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ConflictException when changing the status of an item locked in a swap', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue({
        ...mockCreatedEntity,
        status: ItemStatus.PENDING_SWAP,
      });

      await expect(
        itemsService.update(ownerId, itemId, { status: 'PAUSED' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

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

    it('should replace Want records with embeddings and update the item when called by the owner', async () => {
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

      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Sony WH-1000XM5 Black Audio Noise cancelling headphones in mint condition with case.',
      );
      expect(aiEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'MacBook Air M1',
      );
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
            embedding: mockEmbedding,
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

    it('should throw ConflictException when the item is locked in a swap route', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue({
        ...mockCreatedEntity,
        status: ItemStatus.PENDING_SWAP,
      });

      await expect(itemsService.remove(ownerId, itemId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should archive instead of deleting when the item has swap route history', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(mockCreatedEntity);
      mockTx.swapRouteStep.count.mockResolvedValueOnce(2);

      const result = await itemsService.remove(ownerId, itemId);

      expect(mockTx.item.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: { status: ItemStatus.ARCHIVED },
      });
      expect(mockTx.item.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, id: itemId });
    });
  });
});
