import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schemas';
import { authRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  authController.refresh,
);

router.post(
  '/logout',
  validate({ body: logoutSchema }),
  authController.logout,
);

export const authRouter = router;
