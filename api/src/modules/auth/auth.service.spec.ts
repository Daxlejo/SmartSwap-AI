import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'createUser' | 'findByIdOrThrow'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'valeria@smartswap.co',
    passwordHash: '$2a$10$mockhashedpasswordvalue',
    name: 'Valeria Gomez',
    initials: 'VG',
    avatarUrl: null,
    location: 'Bogotá, Chapinero',
    level: 1,
    rating: 5.0,
    tradesCompleted: 0,
    co2SavedKg: 0,
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
    updatedAt: new Date('2026-10-24T12:00:00.000Z'),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      findByIdOrThrow: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'valeria@smartswap.co',
      password: 'Password123!',
      name: 'Valeria Gomez',
      location: 'Bogotá, Chapinero',
    };

    it('should successfully register a new user, hash the password, and return an access token with a public user profile', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const hashSpy = jest.spyOn(bcrypt, 'hash');

      usersService.createUser.mockImplementation(async (input) => ({
        ...mockUser,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        location: input.location ?? null,
      }));

      const result = await authService.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(hashSpy).toHaveBeenCalledWith(registerDto.password, 10);
      expect(usersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          location: registerDto.location,
          passwordHash: expect.any(String),
        }),
      );

      const createdInput = usersService.createUser.mock.calls[0][0];
      expect(createdInput.passwordHash).not.toBe(registerDto.password);
      await expect(
        bcrypt.compare(registerDto.password, createdInput.passwordHash),
      ).resolves.toBe(true);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        { expiresIn: '7d' },
      );

      expect(result).toEqual({
        accessToken: 'signed-jwt-access-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          initials: mockUser.initials,
          avatarUrl: mockUser.avatarUrl,
          location: mockUser.location,
          level: mockUser.level,
          rating: mockUser.rating,
          tradesCompleted: mockUser.tradesCompleted,
          co2SavedKg: mockUser.co2SavedKg,
          createdAt: mockUser.createdAt,
        },
      });
      expect(
        (result.user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should throw ConflictException when email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'valeria@smartswap.co',
      password: 'Password123!',
    };

    it('should successfully authenticate a user with valid credentials and return access token + public profile', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      const result = await authService.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        { expiresIn: '7d' },
      );
      expect(result.accessToken).toBe('signed-jwt-access-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(
        (result.user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword999!', 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user email does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
