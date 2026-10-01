import { Request, Response, NextFunction } from 'express';
import { TransactionService, transactionService } from './transaction.service';

export class TransactionController {
  constructor(private service: TransactionService = transactionService) {}

  createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.createTransaction(userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getTransactions(userId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const transactionId = req.params.id;
      const result = await this.service.getTransactionById(userId, transactionId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const transactionId = req.params.id;
      const result = await this.service.updateTransaction(userId, transactionId, req.body);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const transactionId = req.params.id;
      const result = await this.service.deleteTransaction(userId, transactionId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const transactionController = new TransactionController();
