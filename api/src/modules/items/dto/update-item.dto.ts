import { ItemStatus } from '@prisma/client';
import { z } from 'zod';
import { itemConditionSchema } from './create-item.dto';

export type ItemStatusInput = 'ACTIVE' | 'PAUSED';

const STATUS_LOOKUP: Record<string, ItemStatusInput> = {
  ACTIVE: 'ACTIVE',
  AVAILABLE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'PAUSED',
};

export function toPrismaItemStatus(status: string): ItemStatus {
  const upper = status.trim().toUpperCase();
  switch (upper) {
    case 'ACTIVE':
    case 'AVAILABLE':
      return ItemStatus.AVAILABLE;
    case 'PAUSED':
    case 'ARCHIVED':
      return ItemStatus.ARCHIVED;
    case 'PENDING_SWAP':
      return ItemStatus.PENDING_SWAP;
    case 'SWAPPED':
      return ItemStatus.SWAPPED;
    default:
      return ItemStatus.AVAILABLE;
  }
}

export const itemStatusSchema = z
  .string()
  .trim()
  .refine((val) => Boolean(STATUS_LOOKUP[val.toUpperCase()]), {
    message: 'status must be either ACTIVE or PAUSED',
  })
  .transform((val): ItemStatusInput => STATUS_LOOKUP[val.toUpperCase()]);

export const updateItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must be at most 100 characters long')
      .optional(),
    category: z
      .string()
      .trim()
      .min(2, 'Category must be at least 2 characters long')
      .max(50, 'Category must be at most 50 characters long')
      .optional(),
    condition: itemConditionSchema.optional(),
    description: z
      .string()
      .trim()
      .min(5, 'Description must be at least 5 characters long')
      .max(1000, 'Description must be at most 1000 characters long')
      .optional(),
    estimatedValue: z.coerce
      .number()
      .positive('estimatedValue must be a positive number')
      .optional(),
    location: z
      .string()
      .trim()
      .min(1, 'Location cannot be empty')
      .max(120, 'Location must be at most 120 characters long')
      .optional(),
    imageUrl: z.string().trim().min(1).optional(),
    images: z
      .array(z.string().trim().min(1, 'Image entry cannot be empty'))
      .min(1, 'At least 1 image is required')
      .max(4, 'At most 4 images are allowed')
      .optional(),
    wants: z
      .array(z.string().trim().min(1, 'Want entry cannot be empty'))
      .min(1, 'At least 1 want is required')
      .max(10, 'At most 10 wants are allowed')
      .optional(),
    aiTags: z.array(z.string().trim().min(1)).optional(),
    status: itemStatusSchema.optional(),
  })
  .strict();

export type UpdateItemDto = z.infer<typeof updateItemSchema>;
