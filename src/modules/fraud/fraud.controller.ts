import { Request, Response, NextFunction } from 'express';
import { FraudManagementService, fraudManagementService } from './fraud.service';

export class FraudController {
  constructor(private service: FraudManagementService = fraudManagementService) {}

  getFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getFlags(userId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateFlagStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const flagId = req.params.id;
      const result = await this.service.updateFlagStatus(userId, flagId, req.body);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}

export const fraudController = new FraudController();
