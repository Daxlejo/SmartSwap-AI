import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  location: string | null;
  departmentCode: string | null;
  municipalityCode: string | null;
  level: number;
  rating: number;
  tradesCompleted: number;
  co2SavedKg: number;
  createdAt: Date;
}

@Injectable()
export class UserMapper {
  static toPublicProfile(user: User): PublicUserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      avatarUrl: user.avatarUrl,
      location: user.location,
      departmentCode: user.departmentCode,
      municipalityCode: user.municipalityCode,
      level: user.level,
      rating: user.rating,
      tradesCompleted: user.tradesCompleted,
      co2SavedKg: user.co2SavedKg,
      createdAt: user.createdAt,
    };
  }
}
