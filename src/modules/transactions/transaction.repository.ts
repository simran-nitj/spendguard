import { CategoryType, Prisma, Transaction } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface TransactionFilters {
  type?: CategoryType;
  categoryId?: string;
  from?: Date;
  to?: Date;
  minAmount?: number;
  maxAmount?: number;
  merchant?: string;
}

export interface TransactionSort {
  sortBy?: 'occurredAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export class TransactionRepository {
  async create(
    data: {
      userId: string;
      categoryId: string;
      amount: number;
      type: CategoryType;
      merchant: string;
      description?: string | null;
      occurredAt?: Date;
    },
    txClient?: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const client = txClient || prisma;
    return client.transaction.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        merchant: data.merchant,
        description: data.description,
        occurredAt: data.occurredAt || new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  async findManyForUser(
    userId: string,
    filters: TransactionFilters,
    skip = 0,
    limit = 20,
    sort: TransactionSort = {},
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(filters.type && { type: filters.type }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...((filters.from || filters.to) && {
        occurredAt: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lte: filters.to }),
        },
      }),
      ...((filters.minAmount !== undefined || filters.maxAmount !== undefined) && {
        amount: {
          ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
          ...(filters.maxAmount !== undefined && { lte: filters.maxAmount }),
        },
      }),
      ...(filters.merchant && {
        merchant: { contains: filters.merchant, mode: 'insensitive' },
      }),
    };

    const sortBy = sort.sortBy || 'occurredAt';
    const sortOrder = sort.sortOrder || 'desc';

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          fraudFlags: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        category: true,
        fraudFlags: true,
      },
    });
  }

  async updateForUser(
    id: string,
    userId: string,
    data: {
      categoryId?: string;
      amount?: number;
      type?: CategoryType;
      merchant?: string;
      description?: string | null;
      occurredAt?: Date;
    },
  ): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id, userId },
      data,
      include: {
        category: true,
        fraudFlags: true,
      },
    });
  }

  async deleteForUser(id: string, userId: string): Promise<Transaction> {
    return prisma.transaction.delete({
      where: { id, userId },
    });
  }
}

export const transactionRepository = new TransactionRepository();
