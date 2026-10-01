import { z } from 'zod';
import { CategoryType } from '@prisma/client';

export const createTransactionSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID format'),
  amount: z
    .number()
    .positive('Amount must be greater than zero')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Amount cannot have more than 2 decimal places',
    }),
  type: z.nativeEnum(CategoryType, {
    errorMap: () => ({ message: 'Transaction type must be INCOME or EXPENSE' }),
  }),
  merchant: z.string().min(1, 'Merchant name is required').max(100),
  description: z.string().max(255).optional().nullable(),
  occurredAt: z.string().datetime({ message: 'Invalid ISO 8601 date string' }).optional(),
}).strict();

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z
    .number()
    .positive()
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Amount cannot have more than 2 decimal places',
    })
    .optional(),
  type: z.nativeEnum(CategoryType).optional(),
  merchant: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
}).strict();

export const transactionQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  type: z.nativeEnum(CategoryType).optional(),
  categoryId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  merchant: z.string().optional(),
  sortBy: z.enum(['occurredAt', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('Invalid transaction ID format'),
}).strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
