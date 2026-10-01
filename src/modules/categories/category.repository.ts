import { Category, CategoryType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class CategoryRepository {
  async findAllForUser(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  async findByNameAndUser(name: string, userId: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        userId,
      },
    });
  }

  async create(data: { name: string; type: CategoryType; userId: string }): Promise<Category> {
    return prisma.category.create({
      data: {
        name: data.name,
        type: data.type,
        userId: data.userId,
      },
    });
  }

  async update(id: string, data: { name?: string; type?: CategoryType }): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }

  async countTransactions(categoryId: string): Promise<number> {
    return prisma.transaction.count({
      where: { categoryId },
    });
  }
}

export const categoryRepository = new CategoryRepository();
