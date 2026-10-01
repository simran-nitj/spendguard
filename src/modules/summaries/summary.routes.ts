import { Router } from 'express';
import { summaryController } from './summary.controller';
import { authenticate } from '../../middlewares/auth';
import { z } from 'zod';
import { validate } from '../../middlewares/validate';

const monthlyQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
});

const trendQuerySchema = z.object({
  months: z.coerce.number().min(1).max(24).optional(),
});

const router = Router();

router.use(authenticate);

router.get(
  '/monthly',
  validate({ query: monthlyQuerySchema }),
  summaryController.getMonthlySummary,
);

router.get(
  '/trend',
  validate({ query: trendQuerySchema }),
  summaryController.getTrendSummary,
);

export const summaryRouter = router;
