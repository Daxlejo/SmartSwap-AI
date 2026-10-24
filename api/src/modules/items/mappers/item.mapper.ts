import { Injectable } from '@nestjs/common';
import { Item, ItemCondition, ItemStatus, User, Want } from '@prisma/client';
import {
  NormalizedItemCondition,
  normalizeItemCondition,
} from '../dto/create-item.dto';

export type ItemConditionLabel =
  | 'Como nuevo'
  | 'Excelente'
  | 'Bueno'
  | 'Para piezas';

export type ItemOwnerSummary = Pick<
  User,
  'id' | 'name' | 'initials' | 'rating' | 'location'
>;

export type ItemWantSummary = Pick<Want, 'queryText'>;

export type ItemWithRelations = Item & {
  owner?: ItemOwnerSummary | null;
  wants?: ItemWantSummary[];
};

export interface ItemResponseDto {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerInitials: string;
  ownerRating: number;
  name: string;
  category: string;
  condition: NormalizedItemCondition;
  conditionLabel: ItemConditionLabel;
  description: string;
  estimatedValue: number;
  location: string;
  status: string;
  images: string[];
  image: string | null;
  wants: string[];
  aiTags: string[];
  createdAt: Date;
}

const CONDITION_TO_SPANISH_LABEL: Record<
  NormalizedItemCondition,
  ItemConditionLabel
> = {
  LIKE_NEW: 'Como nuevo',
  EXCELLENT: 'Excelente',
  GOOD: 'Bueno',
  FOR_PARTS: 'Para piezas',
};

@Injectable()
export class ItemMapper {
  static toResponse(item: ItemWithRelations): ItemResponseDto {
    const condition = ItemMapper.mapCondition(item.condition);
    const conditionLabel = CONDITION_TO_SPANISH_LABEL[condition];
    const images = Array.isArray(item.images) ? item.images : [];

    return {
      id: item.id,
      ownerId: item.ownerId,
      ownerName: item.owner?.name ?? 'SmartSwap User',
      ownerInitials: item.owner?.initials ?? 'SU',
      ownerRating: item.owner?.rating ?? 5.0,
      name: item.name,
      category: item.category,
      condition,
      conditionLabel,
      description: item.description ?? '',
      estimatedValue: item.estimatedValue ?? 0,
      location: item.location ?? item.owner?.location ?? 'Colombia',
      status: ItemMapper.mapStatus(item.status),
      images,
      image: images[0] ?? null,
      wants: (item.wants ?? []).map((want) => want.queryText),
      aiTags: Array.isArray(item.aiTags) ? item.aiTags : [],
      createdAt: item.createdAt,
    };
  }

  static toResponseList(items: ItemWithRelations[]): ItemResponseDto[] {
    return items.map((item) => ItemMapper.toResponse(item));
  }

  private static mapCondition(
    rawCondition: ItemCondition | string,
  ): NormalizedItemCondition {
    try {
      return normalizeItemCondition(String(rawCondition));
    } catch {
      return 'GOOD';
    }
  }

  private static mapStatus(rawStatus: ItemStatus | string): string {
    const upper = String(rawStatus).toUpperCase();
    switch (upper) {
      case 'AVAILABLE':
      case 'ACTIVE':
        return 'ACTIVE';
      case 'ARCHIVED':
      case 'PAUSED':
        return 'PAUSED';
      case 'PENDING_SWAP':
        return 'PENDING_SWAP';
      case 'SWAPPED':
        return 'SWAPPED';
      default:
        return 'ACTIVE';
    }
  }
}
