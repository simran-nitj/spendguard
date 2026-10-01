import { Router } from 'express';
import { transactionController } from './transaction.controller';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  transactionIdParamSchema,
} from './transaction.schemas';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate({ body: createTransactionSchema }),
  transactionController.createTransaction,
);

router.get(
  '/',
  validate({ query: transactionQuerySchema }),
  transactionController.getTransactions,
);

router.get(
  '/:id',
  validate({ params: transactionIdParamSchema }),
  transactionController.getTransactionById,
);

router.patch(
  '/:id',
  validate({ params: transactionIdParamSchema, body: updateTransactionSchema }),
  transactionController.updateTransaction,
);

router.delete(
  '/:id',
  validate({ params: transactionIdParamSchema }),
  transactionController.deleteTransaction,
);

export const transactionRouter = router;
