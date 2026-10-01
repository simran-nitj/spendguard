import { SummaryRepository, summaryRepository } from './summary.repository';
import { parseMonthString, formatYearMonth, getPreviousMonthString } from '../../utils/dates';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  type: string;
  totalAmount: number;
  percentage: number;
}

export interface MonthlySummaryResponse {
  month: string;
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  topMerchants: { merchant: string; totalAmount: number; count: number }[];
  previousMonthComparison: {
    previousMonth: string;
    incomeChangePercentage: number;
    expenseChangePercentage: number;
    netChangePercentage: number;
  };
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export class SummaryService {
  constructor(private repo: SummaryRepository = summaryRepository) {}

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
  }

  async getMonthlySummary(userId: string, monthStr?: string): Promise<MonthlySummaryResponse> {
    const targetMonth = monthStr || formatYearMonth(new Date());
    const { startOfMonth, endOfMonth } = parseMonthString(targetMonth);

    const prevMonthStr = getPreviousMonthString(targetMonth);
    const { startOfMonth: prevStart, endOfMonth: prevEnd } = parseMonthString(prevMonthStr);

    const [currentTotals, prevTotals, categories, topMerchants] = await Promise.all([
      this.repo.getMonthlyTotals(userId, startOfMonth, endOfMonth),
      this.repo.getMonthlyTotals(userId, prevStart, prevEnd),
      this.repo.getCategoryBreakdown(userId, startOfMonth, endOfMonth),
      this.repo.getTopMerchants(userId, startOfMonth, endOfMonth, 5),
    ]);

    const income = Number(currentTotals.totalIncome.toFixed(2));
    const expense = Number(currentTotals.totalExpense.toFixed(2));
    const net = Number((income - expense).toFixed(2));

    const prevIncome = prevTotals.totalIncome;
    const prevExpense = prevTotals.totalExpense;
    const prevNet = prevIncome - prevExpense;

    const categoryBreakdown: CategoryBreakdownItem[] = categories.map((cat) => {
      const typeTotal = cat.type === 'INCOME' ? income : expense;
      const percentage = typeTotal > 0 ? Number(((cat.totalAmount / typeTotal) * 100).toFixed(2)) : 0;
      return {
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        type: cat.type,
        totalAmount: Number(cat.totalAmount.toFixed(2)),
        percentage,
      };
    });

    return {
      month: targetMonth,
      totals: {
        income,
        expense,
        net,
      },
      categoryBreakdown,
      topMerchants: topMerchants.map((m) => ({
        merchant: m.merchant,
        totalAmount: Number(m.totalAmount.toFixed(2)),
        count: m.count,
      })),
      previousMonthComparison: {
        previousMonth: prevMonthStr,
        incomeChangePercentage: this.calculatePercentageChange(income, prevIncome),
        expenseChangePercentage: this.calculatePercentageChange(expense, prevExpense),
        netChangePercentage: this.calculatePercentageChange(net, prevNet),
      },
    };
  }

  async getTrendSummary(userId: string, monthsCount = 6): Promise<MonthlyTrendItem[]> {
    const months = Math.min(24, Math.max(1, monthsCount));
    const now = new Date();
    const result: MonthlyTrendItem[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const monthStr = formatYearMonth(targetDate);
      const { startOfMonth, endOfMonth } = parseMonthString(monthStr);

      const totals = await this.repo.getMonthlyTotals(userId, startOfMonth, endOfMonth);
      const income = Number(totals.totalIncome.toFixed(2));
      const expense = Number(totals.totalExpense.toFixed(2));

      result.push({
        month: monthStr,
        income,
        expense,
        net: Number((income - expense).toFixed(2)),
      });
    }

    return result;
  }
}

export const summaryService = new SummaryService();
