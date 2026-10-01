import { Router } from 'express';
import { categoryController } from './category.controller';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from './category.schemas';

const router = Router();

router.use(authenticate);

router.get('/', categoryController.getCategories);

router.post(
  '/',
  validate({ body: createCategorySchema }),
  categoryController.createCategory,
);

router.patch(
  '/:id',
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory,
);

router.delete(
  '/:id',
  validate({ params: categoryIdParamSchema }),
  categoryController.deleteCategory,
);

export const categoryRouter = router;
