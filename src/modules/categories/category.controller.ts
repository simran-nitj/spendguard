import { Request, Response, NextFunction } from 'express';
import { CategoryService, categoryService } from './category.service';

export class CategoryController {
  constructor(private service: CategoryService = categoryService) {}

  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const categories = await this.service.getCategories(userId);
      res.status(200).json({ data: categories });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const category = await this.service.createCategory(userId, req.body);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const categoryId = req.params.id;
      const category = await this.service.updateCategory(userId, categoryId, req.body);
      res.status(200).json({ data: category });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const categoryId = req.params.id;
      const result = await this.service.deleteCategory(userId, categoryId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const categoryController = new CategoryController();
