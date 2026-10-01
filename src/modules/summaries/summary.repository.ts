import { CategoryType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface CategorySummaryRaw {
  categoryId: string;
  categoryName: string;
  type: CategoryType;
  totalAmount: number;
}

export interface TopMerchantRaw {
  merchant: string;
  totalAmount: number;
  count: number;
}

export interface MonthlyTotalsRaw {
  totalIncome: number;
  totalExpense: number;
}

export class SummaryRepository {
  async getMonthlyTotals(userId: string, startDate: Date, endDate: Date): Promise<MonthlyTotalsRaw> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      const amt = Number(tx.amount);
      if (tx.type === CategoryType.INCOME) {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    }

    return { totalIncome, totalExpense };
  }

  async getCategoryBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CategorySummaryRaw[]> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
    });

    const categoryMap: Record<
      string,
      { categoryId: string; categoryName: string; type: CategoryType; totalAmount: number }
    > = {};

    for (const tx of transactions) {
      const catId = tx.categoryId;
      const amt = Number(tx.amount);
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          categoryId: catId,
          categoryName: tx.category.name,
          type: tx.type,
          totalAmount: 0,
        };
      }
      categoryMap[catId].totalAmount += amt;
    }

    return Object.values(categoryMap);
  }

  async getTopMerchants(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit = 5,
  ): Promise<TopMerchantRaw[]> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: CategoryType.EXPENSE,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        merchant: true,
        amount: true,
      },
    });

    const merchantMap: Record<string, { merchant: string; totalAmount: number; count: number }> = {};

    for (const tx of transactions) {
      const mName = tx.merchant;
      const amt = Number(tx.amount);
      if (!merchantMap[mName]) {
        merchantMap[mName] = { merchant: mName, totalAmount: 0, count: 0 };
      }
      merchantMap[mName].totalAmount += amt;
      merchantMap[mName].count += 1;
    }

    return Object.values(merchantMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }
}

export const summaryRepository = new SummaryRepository();
