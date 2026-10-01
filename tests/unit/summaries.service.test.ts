import { SummaryService } from '../../src/modules/summaries/summary.service';
import { SummaryRepository } from '../../src/modules/summaries/summary.repository';

describe('SummaryService (Unit)', () => {
  let summaryService: SummaryService;
  let mockSummaryRepo: jest.Mocked<SummaryRepository>;

  beforeEach(() => {
    mockSummaryRepo = {
      getMonthlyTotals: jest.fn(),
      getCategoryBreakdown: jest.fn(),
      getTopMerchants: jest.fn(),
    } as any;

    summaryService = new SummaryService(mockSummaryRepo);
  });

  describe('getMonthlySummary', () => {
    it('should correctly calculate income, expense, net, category %, and MoM comparison', async () => {
      const userId = 'user-123';
      const monthStr = '2026-09';

      mockSummaryRepo.getMonthlyTotals
        .mockResolvedValueOnce({ totalIncome: 5000, totalExpense: 2000 }) // Current month (2026-09)
        .mockResolvedValueOnce({ totalIncome: 4000, totalExpense: 1000 }); // Previous month (2026-08)

      mockSummaryRepo.getCategoryBreakdown.mockResolvedValue([
        { categoryId: 'cat-1', categoryName: 'Rent', type: 'EXPENSE', totalAmount: 1500 },
        { categoryId: 'cat-2', categoryName: 'Food', type: 'EXPENSE', totalAmount: 500 },
      ]);

      mockSummaryRepo.getTopMerchants.mockResolvedValue([
        { merchant: 'Skyline Rent', totalAmount: 1500, count: 1 },
        { merchant: 'Whole Foods', totalAmount: 500, count: 4 },
      ]);

      const result = await summaryService.getMonthlySummary(userId, monthStr);

      expect(result.month).toBe('2026-09');
      expect(result.totals.income).toBe(5000);
      expect(result.totals.expense).toBe(2000);
      expect(result.totals.net).toBe(3000);

      // Category percentage check: Rent = 1500 / 2000 = 75%
      expect(result.categoryBreakdown[0].percentage).toBe(75);
      // Food = 500 / 2000 = 25%
      expect(result.categoryBreakdown[1].percentage).toBe(25);

      // MoM percentage change check:
      // Income: (5000 - 4000) / 4000 * 100 = 25%
      expect(result.previousMonthComparison.incomeChangePercentage).toBe(25);
      // Expense: (2000 - 1000) / 1000 * 100 = 100%
      expect(result.previousMonthComparison.expenseChangePercentage).toBe(100);
      // Net: current net=3000, prev net=3000. Change = 0%
      expect(result.previousMonthComparison.netChangePercentage).toBe(0);
    });
  });

  describe('getTrendSummary', () => {
    it('should return trend data for requested number of months', async () => {
      const userId = 'user-123';
      mockSummaryRepo.getMonthlyTotals.mockResolvedValue({ totalIncome: 6000, totalExpense: 2500 });

      const trend = await summaryService.getTrendSummary(userId, 3);

      expect(trend).toHaveLength(3);
      expect(trend[0].income).toBe(6000);
      expect(trend[0].expense).toBe(2500);
      expect(trend[0].net).toBe(3500);
    });
  });
});
