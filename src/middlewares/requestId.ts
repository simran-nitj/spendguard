import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.header('x-request-id');
  const reqId = existingId || randomUUID();
  (req as any).id = reqId;
  res.setHeader('x-request-id', reqId);
  next();
};

