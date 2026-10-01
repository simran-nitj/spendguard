import { Request, Response, NextFunction } from 'express';
import { SummaryService, summaryService } from './summary.service';

export class SummaryController {
  constructor(private service: SummaryService = summaryService) {}

  getMonthlySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const month = req.query.month as string | undefined;
      const result = await this.service.getMonthlySummary(userId, month);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  getTrendSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const result = await this.service.getTrendSummary(userId, months);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}

export const summaryController = new SummaryController();
