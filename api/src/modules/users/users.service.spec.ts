import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ItemStatus,
  RouteStatus,
  StepAcceptance,
  User,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { CreateUserInput, UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'carlos.mendoza@smartswap.co',
    passwordHash: '$2a$10$hashedpasswordforexample',
    name: 'Carlos Mendoza',
    initials: 'CM',
    avatarUrl: 'https://smartswap.co/avatars/cm.jpg',
    location: 'Bogotá, Usaquén',
    departmentCode: '11',
    municipalityCode: '11001',
    level: 3,
    rating: 4.85,
    tradesCompleted: 12,
    co2SavedKg: 42.6,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-25T15:30:00.000Z'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    item: {
      count: jest.fn(),
    },
    swapRoute: {
      count: jest.fn(),
    },
    swapRouteStep: {
      count: jest.fn(),
    },
  };

  const mockStorage = {
    uploadBase64Image: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        GeoService,
        {
          provide: SupabaseStorageService,
          useValue: mockStorage,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('should find user by normalized trimmed lowercase email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByEmail('  Carlos.Mendoza@SmartSwap.CO  ');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'carlos.mendoza@smartswap.co' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user email is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return user when user id exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByIdOrThrow(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user id is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        usersService.findByIdOrThrow('non-existent-user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUser', () => {
    it('should normalize email, trim fields, compute initials for multi-word name, and persist user', async () => {
      const input: CreateUserInput = {
        email: '  Valeria.Gomez@SmartSwap.CO ',
        passwordHash: '$2a$10$securehashvalue',
        name: '  Valeria Gomez  ',
        location: '  Bogotá, Chapinero  ',
      };

      const createdUser: User = {
        ...mockUser,
        email: 'valeria.gomez@smartswap.co',
        name: 'Valeria Gomez',
        initials: 'VG',
        location: 'Bogotá, Chapinero',
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await usersService.createUser(input);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'valeria.gomez@smartswap.co',
          passwordHash: '$2a$10$securehashvalue',
          name: 'Valeria Gomez',
          initials: 'VG',
          location: 'Bogotá, Chapinero',
          departmentCode: null,
          municipalityCode: null,
        },
      });
      expect(result).toEqual(createdUser);
    });

    it('should compute initials for a single-word name by taking first two uppercase letters', async () => {
      const input: CreateUserInput = {
        email: 'alex@example.com',
        passwordHash: '$2a$10$hash',
        name: 'Alex',
      };

      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        name: 'Alex',
        initials: 'AL',
        location: null,
      });

      await usersService.createUser(input);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'alex@example.com',
          passwordHash: '$2a$10$hash',
          name: 'Alex',
          initials: 'AL',
          location: null,
          departmentCode: null,
          municipalityCode: null,
        },
      });
    });

    it('should compute initials fallback US when name contains only whitespace', async () => {
      const input: CreateUserInput = {
        email: 'user@example.com',
        passwordHash: '$2a$10$hash',
        name: '   ',
      };

      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        name: '',
        initials: 'US',
        location: null,
      });

      await usersService.createUser(input);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          passwordHash: '$2a$10$hash',
          name: '',
          initials: 'US',
          location: null,
          departmentCode: null,
          municipalityCode: null,
        },
      });
    });
  });

  describe('municipality handling', () => {
    it('derives department and display location from the municipality when creating a user', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await usersService.createUser({
        email: 'camila@example.com',
        passwordHash: '$2a$10$hash',
        name: 'Camila Torres',
        location: 'texto libre ignorado',
        municipalityCode: '52001',
      });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Pasto, Nariño',
          departmentCode: '52',
          municipalityCode: '52001',
        }),
      });
    });

    it('rejects unknown municipality codes on registration', async () => {
      await expect(
        usersService.createUser({
          email: 'x@example.com',
          passwordHash: '$2a$10$hash',
          name: 'X Person',
          municipalityCode: '99999',
        }),
      ).rejects.toThrow('Unknown municipality code');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('updates department and location together when the profile municipality changes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await usersService.updateProfile(mockUser.id, { municipalityCode: '05001' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          municipalityCode: '05001',
          departmentCode: '05',
          location: 'Medellín, Antioquia',
        },
      });
    });
  });

  describe('updateProfile', () => {
    it('should throw NotFoundException when updating non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('unknown-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should update name and recalculate initials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const updatedUser: User = {
        ...mockUser,
        name: 'Carlos Alberto Mendoza',
        initials: 'CM',
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.updateProfile(mockUser.id, {
        name: '  Carlos Alberto Mendoza  ',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          name: 'Carlos Alberto Mendoza',
          initials: 'CM',
        },
      });
      expect(result.name).toBe('Carlos Alberto Mendoza');
      expect(result.initials).toBe('CM');
    });

    it('should update location and avatarUrl when provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const updatedUser: User = {
        ...mockUser,
        location: 'Medellín, El Poblado',
        avatarUrl: 'https://smartswap.co/avatars/new.png',
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.updateProfile(mockUser.id, {
        location: '  Medellín, El Poblado  ',
        avatarUrl: '  https://smartswap.co/avatars/new.png  ',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          location: 'Medellín, El Poblado',
          avatarUrl: 'https://smartswap.co/avatars/new.png',
        },
      });
      expect(result.location).toBe('Medellín, El Poblado');
      expect(result.avatarUrl).toBe('https://smartswap.co/avatars/new.png');
    });
  });

  describe('getUserStats', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        usersService.getUserStats('non-existent-user'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.item.count).not.toHaveBeenCalled();
      expect(mockPrismaService.swapRoute.count).not.toHaveBeenCalled();
      expect(mockPrismaService.swapRouteStep.count).not.toHaveBeenCalled();
    });

    it('should compute activeItemsCount, lockedItemsCount, activeRoutesCount, and pendingApprovalsCount in parallel and return user stats', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // item.count calls: 1st for AVAILABLE, 2nd for PENDING_SWAP
      mockPrismaService.item.count
        .mockResolvedValueOnce(5) // activeItemsCount
        .mockResolvedValueOnce(2); // lockedItemsCount

      // swapRoute.count call: PROPOSED or CONFIRMED routes where user is step participant
      mockPrismaService.swapRoute.count.mockResolvedValueOnce(3); // activeRoutesCount

      // swapRouteStep.count call: steps for user with PENDING acceptance in PROPOSED routes
      mockPrismaService.swapRouteStep.count.mockResolvedValueOnce(1); // pendingApprovalsCount

      const response = await usersService.getUserStats(mockUser.id);

      // Verify item count queries
      expect(mockPrismaService.item.count).toHaveBeenCalledWith({
        where: {
          ownerId: mockUser.id,
          status: ItemStatus.AVAILABLE,
        },
      });
      expect(mockPrismaService.item.count).toHaveBeenCalledWith({
        where: {
          ownerId: mockUser.id,
          status: ItemStatus.PENDING_SWAP,
        },
      });

      // Verify activeRoutesCount query (PROPOSED or CONFIRMED routes where user is participant)
      expect(mockPrismaService.swapRoute.count).toHaveBeenCalledWith({
        where: {
          status: {
            in: [
              RouteStatus.ACTIVE,
              RouteStatus.SUGGESTED,
              RouteStatus.CONFIRMED,
            ],
          },
          steps: {
            some: {
              userId: mockUser.id,
            },
          },
        },
      });

      // Verify pendingApprovalsCount query (PENDING steps in PROPOSED routes)
      expect(mockPrismaService.swapRouteStep.count).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          acceptance: StepAcceptance.PENDING,
          route: {
            status: {
              in: [RouteStatus.ACTIVE, RouteStatus.SUGGESTED],
            },
          },
        },
      });

      // Verify response structure
      expect(response).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          initials: mockUser.initials,
          avatarUrl: mockUser.avatarUrl,
          location: mockUser.location,
          departmentCode: mockUser.departmentCode,
          municipalityCode: mockUser.municipalityCode,
          level: mockUser.level,
          rating: mockUser.rating,
          tradesCompleted: mockUser.tradesCompleted,
          co2SavedKg: mockUser.co2SavedKg,
          createdAt: mockUser.createdAt,
        },
        stats: {
          activeItemsCount: 5,
          lockedItemsCount: 2,
          activeRoutesCount: 3,
          pendingApprovalsCount: 1,
          tradesCompleted: mockUser.tradesCompleted,
          co2SavedKg: mockUser.co2SavedKg,
          rating: mockUser.rating,
          level: mockUser.level,
        },
      });

      // Verify passwordHash is never returned
      expect((response.user as any).passwordHash).toBeUndefined();
    });
  });
  describe('uploadAvatar', () => {
    it('stores the image under avatars/ with a 2 MB cap and saves the public URL', async () => {
      const url = 'https://x.supabase.co/storage/v1/object/public/item-images/avatars/u/a.jpg';
      mockStorage.uploadBase64Image.mockResolvedValue({ url });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, avatarUrl: url });

      const result = await usersService.uploadAvatar(mockUser.id, 'data:image/jpeg;base64,AAAA');

      expect(mockStorage.uploadBase64Image).toHaveBeenCalledWith(
        mockUser.id,
        'data:image/jpeg;base64,AAAA',
        undefined,
        { folder: 'avatars', maxBytes: 2 * 1024 * 1024 },
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { avatarUrl: url },
      });
      expect(result.avatarUrl).toBe(url);
    });

    it('does not touch the user when the upload fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStorage.uploadBase64Image.mockRejectedValue(new Error('boom'));

      await expect(
        usersService.uploadAvatar(mockUser.id, 'data:image/jpeg;base64,AAAA'),
      ).rejects.toThrow('boom');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
});
