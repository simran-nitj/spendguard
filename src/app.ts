import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware } from './middlewares/requestId';
import { httpLogger } from './lib/logger';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import { NotFoundError } from './errors/AppError';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { categoryRouter } from './modules/categories/category.routes';
import { transactionRouter } from './modules/transactions/transaction.routes';
import { fraudRouter } from './modules/fraud/fraud.routes';
import { summaryRouter } from './modules/summaries/summary.routes';
import { setupSwagger } from './config/swagger';

export const createApp = (): Application => {
  const app = express();

  // 1. Swagger OpenAPI Docs at /api/docs
  setupSwagger(app);

  // 2. Security & Core Middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // 3. Global Rate Limiter
  app.use('/api/', globalRateLimiter);

  // 4. Health & Feature Routes
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/transactions', transactionRouter);
  app.use('/api/v1/fraud', fraudRouter);
  app.use('/api/v1/summaries', summaryRouter);

  // 5. 404 Fallback
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('The requested endpoint does not exist.'));
  });

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
