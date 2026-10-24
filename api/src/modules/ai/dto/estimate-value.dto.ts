import { z } from 'zod';

export const itemConditionEnum = z.enum([
  'LIKE_NEW',
  'EXCELLENT',
  'GOOD',
  'FOR_PARTS',
]);

export type ItemConditionType = z.infer<typeof itemConditionEnum>;

export const estimateValueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Item name must be at least 2 characters long')
    .max(140, 'Item name must be at most 140 characters long'),
  category: z
    .string()
    .trim()
    .min(2, 'Category must be at least 2 characters long')
    .max(80, 'Category must be at most 80 characters long'),
  condition: itemConditionEnum,
  description: z.string().trim().max(2000).optional(),
});

export type EstimateValueDto = z.infer<typeof estimateValueSchema>;
