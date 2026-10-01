import { z } from 'zod';
import { FraudSeverity, FraudStatus } from '@prisma/client';

export const fraudQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.nativeEnum(FraudStatus).optional(),
  severity: z.nativeEnum(FraudSeverity).optional(),
});

export const updateFraudFlagSchema = z.object({
  status: z.enum([FraudStatus.REVIEWED, FraudStatus.DISMISSED], {
    errorMap: () => ({ message: 'Status must be REVIEWED or DISMISSED' }),
  }),
}).strict();

export const fraudIdParamSchema = z.object({
  id: z.string().uuid('Invalid fraud flag ID format'),
}).strict();

export type FraudQueryInput = z.infer<typeof fraudQuerySchema>;
export type UpdateFraudFlagInput = z.infer<typeof updateFraudFlagSchema>;
