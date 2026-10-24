import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  location?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async createUser(data: CreateUserInput): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const trimmedName = data.name.trim();
    const initials = this.computeInitials(trimmedName);

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        name: trimmedName,
        initials,
        location: data.location?.trim() || null,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.findByIdOrThrow(userId);

    const updateData: {
      name?: string;
      initials?: string;
      location?: string;
      avatarUrl?: string;
    } = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      updateData.name = trimmedName;
      updateData.initials = this.computeInitials(trimmedName);
    }

    if (dto.location !== undefined) {
      updateData.location = dto.location.trim();
    }

    if (dto.avatarUrl !== undefined) {
      updateData.avatarUrl = dto.avatarUrl.trim();
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  private computeInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return 'US';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase().padEnd(2, parts[0][0].toUpperCase());
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
