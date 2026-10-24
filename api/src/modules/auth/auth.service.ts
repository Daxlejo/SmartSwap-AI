import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  PublicUserProfile,
  UserMapper,
} from '../users/mappers/user.mapper';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResponse {
  accessToken: string;
  user: PublicUserProfile;
}

const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
      location: dto.location,
    });

    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      user: UserMapper.toPublicProfile(user),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      user: UserMapper.toPublicProfile(user),
    };
  }

  async getMe(userId: string): Promise<PublicUserProfile> {
    const user = await this.usersService.findByIdOrThrow(userId);
    return UserMapper.toPublicProfile(user);
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: CurrentUserPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }
}
