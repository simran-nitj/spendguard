import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

describe('Summaries Endpoints (Integration)', () => {
  const userId = 'user-uuid-1';
  const validToken = jwt.sign(
    { sub: userId, email: 'user@example.com' },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_super_secure_key_min_32_chars',
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/summaries/monthly', () => {
    it('should return monthly financial summary with MoM comparison', async () => {
      (prisma.transaction.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { amount: 5000, type: 'INCOME' },
          { amount: 2000, type: 'EXPENSE' },
        ]) // current month totals
        .mockResolvedValueOnce([
          { amount: 4000, type: 'INCOME' },
          { amount: 1500, type: 'EXPENSE' },
        ]) // previous month totals
        .mockResolvedValueOnce([
          { categoryId: 'cat-1', amount: 2000, type: 'EXPENSE', category: { name: 'Rent' } },
        ]) // category breakdown
        .mockResolvedValueOnce([
          { merchant: 'Skyline Rent', amount: 2000 },
        ]); // top merchants

      const response = await request(app)
        .get('/api/v1/summaries/monthly?month=2026-09')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.month).toBe('2026-09');
      expect(response.body.data.totals.income).toBe(5000);
      expect(response.body.data.totals.expense).toBe(2000);
      expect(response.body.data.totals.net).toBe(3000);
    });
  });

  describe('GET /api/v1/summaries/trend', () => {
    it('should return historical trends for specified months', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { amount: 3000, type: 'INCOME' },
        { amount: 1000, type: 'EXPENSE' },
      ]);

      const response = await request(app)
        .get('/api/v1/summaries/trend?months=3')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });
  });
});
