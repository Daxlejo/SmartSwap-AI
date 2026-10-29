import { ItemCondition } from '@prisma/client';
import { z } from 'zod';

export const ITEM_CONDITIONS = [
  'LIKE_NEW',
  'EXCELLENT',
  'GOOD',
  'FOR_PARTS',
] as const;

export type NormalizedItemCondition = (typeof ITEM_CONDITIONS)[number];

const CONDITION_LOOKUP: Record<string, NormalizedItemCondition> = {
  LIKE_NEW: 'LIKE_NEW',
  'COMO NUEVO': 'LIKE_NEW',
  NUEVO: 'LIKE_NEW',
  EXCELLENT: 'EXCELLENT',
  EXCELENTE: 'EXCELLENT',
  'EXCELENTE ESTADO': 'EXCELLENT',
  NEW: 'EXCELLENT',
  GOOD: 'GOOD',
  BUENO: 'GOOD',
  'BUEN ESTADO': 'GOOD',
  REGULAR: 'GOOD',
  FAIR: 'GOOD',
  FOR_PARTS: 'FOR_PARTS',
  'PARA PIEZAS': 'FOR_PARTS',
  'PARA REPUESTO': 'FOR_PARTS',
  POOR: 'FOR_PARTS',
};

export function normalizeItemCondition(
  rawCondition: string,
): NormalizedItemCondition {
  const key = rawCondition.trim().toUpperCase();
  const normalized = CONDITION_LOOKUP[key];
  if (!normalized) {
    throw new Error(
      `Invalid condition "${rawCondition}". Allowed values: LIKE_NEW, EXCELLENT, GOOD, FOR_PARTS (or Como nuevo, Excelente, Bueno, Para piezas)`,
    );
  }
  return normalized;
}

export function toPrismaItemCondition(
  condition: NormalizedItemCondition | string,
): ItemCondition {
  const normalized = normalizeItemCondition(condition);
  switch (normalized) {
    case 'LIKE_NEW':
      return ItemCondition.LIKE_NEW;
    case 'EXCELLENT':
      return ItemCondition.NEW;
    case 'GOOD':
      return ItemCondition.GOOD;
    case 'FOR_PARTS':
      return ItemCondition.POOR;
  }
}

export const itemConditionSchema = z
  .string()
  .trim()
  .refine((val) => Boolean(CONDITION_LOOKUP[val.toUpperCase()]), {
    message:
      'Condition must be one of LIKE_NEW, EXCELLENT, GOOD, FOR_PARTS (or Como nuevo, Excelente, Bueno, Para piezas)',
  })
  .transform((val): NormalizedItemCondition => normalizeItemCondition(val));

export const createItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must be at most 100 characters long'),
    category: z
      .string()
      .trim()
      .min(2, 'Category must be at least 2 characters long')
      .max(50, 'Category must be at most 50 characters long'),
    condition: itemConditionSchema,
    description: z
      .string()
      .trim()
      .min(5, 'Description must be at least 5 characters long')
      .max(1000, 'Description must be at most 1000 characters long'),
    estimatedValue: z.coerce
      .number()
      .positive('estimatedValue must be a positive number'),
    location: z
      .string()
      .trim()
      .min(1, 'Location cannot be empty')
      .max(120, 'Location must be at most 120 characters long')
      .optional(),
    municipalityCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, 'municipalityCode must be a 5-digit DANE code')
      .optional(),
    imageUrl: z.string().trim().min(1).optional(),
    images: z
      .array(z.string().trim().min(1, 'Image entry cannot be empty'))
      .min(1, 'At least 1 image is required')
      .max(4, 'At most 4 images are allowed'),
    wants: z
      .array(z.string().trim().min(1, 'Want entry cannot be empty'))
      .min(1, 'At least 1 want is required')
      .max(10, 'At most 10 wants are allowed'),
    aiTags: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export type CreateItemDto = z.infer<typeof createItemSchema>;
