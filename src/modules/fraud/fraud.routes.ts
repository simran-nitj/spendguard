import { Router } from 'express';
import { fraudController } from './fraud.controller';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { fraudQuerySchema, updateFraudFlagSchema, fraudIdParamSchema } from './fraud.schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/flags',
  validate({ query: fraudQuerySchema }),
  fraudController.getFlags,
);

router.patch(
  '/flags/:id',
  validate({ params: fraudIdParamSchema, body: updateFraudFlagSchema }),
  fraudController.updateFlagStatus,
);

export const fraudRouter = router;
