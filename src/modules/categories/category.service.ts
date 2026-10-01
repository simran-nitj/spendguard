import { Category } from '@prisma/client';
import { CategoryRepository, categoryRepository } from './category.repository';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schemas';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError';

export class CategoryService {
  constructor(private repo: CategoryRepository = categoryRepository) {}

  async getCategories(userId: string): Promise<Category[]> {
    return this.repo.findAllForUser(userId);
  }

  async createCategory(userId: string, input: CreateCategoryInput): Promise<Category> {
    const existing = await this.repo.findByNameAndUser(input.name, userId);
    if (existing) {
      throw new ConflictError(`Category with name '${input.name}' already exists.`);
    }

    return this.repo.create({
      name: input.name,
      type: input.type,
      userId,
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    const category = await this.repo.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    if (category.userId === null) {
      throw new ForbiddenError('System default categories cannot be modified.');
    }

    if (category.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this category.');
    }

    if (input.name && input.name !== category.name) {
      const existing = await this.repo.findByNameAndUser(input.name, userId);
      if (existing) {
        throw new ConflictError(`Category with name '${input.name}' already exists.`);
      }
    }

    return this.repo.update(categoryId, input);
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ message: string }> {
    const category = await this.repo.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    if (category.userId === null) {
      throw new ForbiddenError('System default categories cannot be deleted.');
    }

    if (category.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this category.');
    }

    const txCount = await this.repo.countTransactions(categoryId);
    if (txCount > 0) {
      throw new BadRequestError('Cannot delete category with associated transactions.');
    }

    await this.repo.delete(categoryId);
    return { message: 'Category deleted successfully.' };
  }
}

export const categoryService = new CategoryService();
