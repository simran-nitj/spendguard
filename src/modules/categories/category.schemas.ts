import { z } from 'zod';
import { CategoryType } from '@prisma/client';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  type: z.nativeEnum(CategoryType, {
    errorMap: () => ({ message: 'Category type must be INCOME or EXPENSE' }),
  }),
}).strict();

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.nativeEnum(CategoryType).optional(),
}).strict();

export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
}).strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
