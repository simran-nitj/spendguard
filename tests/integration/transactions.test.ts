import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { CategoryType } from '@prisma/client';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      findById: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    fraudFlag: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

describe('Transactions Endpoints (Integration)', () => {
  const userId = '10000000-0000-0000-0000-000000000001';
  const otherUserId = '10000000-0000-0000-0000-000000000002';
  const categoryId = '11111111-1111-1111-1111-111111111111';
  const txId = '22222222-2222-2222-2222-222222222222';

  const validToken = jwt.sign(
    { sub: userId, email: 'user@example.com' },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_super_secure_key_min_32_chars',
  );

  const otherUserToken = jwt.sign(
    { sub: otherUserId, email: 'other@example.com' },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_super_secure_key_min_32_chars',
  );

  const mockCategory = {
    id: categoryId,
    userId: null,
    name: 'Food',
    type: CategoryType.EXPENSE,
  };

  const mockTx = {
    id: txId,
    userId,
    categoryId,
    amount: 50.0,
    type: CategoryType.EXPENSE,
    merchant: 'Starbucks',
    description: 'Coffee',
    occurredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory,
    fraudFlags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create transaction and return 201', async () => {
      (prisma.category.findUnique as jest.Mock).mockImplementation(async () => mockCategory);
      (prisma.transaction.create as jest.Mock).mockImplementation(async () => mockTx);
      (prisma.fraudFlag.create as jest.Mock).mockImplementation(async () => ({ id: 'flag-1' }));
      (prisma.transaction.aggregate as jest.Mock).mockImplementation(async () => ({ _avg: { amount: 30 }, _count: { id: 5 } }));
      (prisma.transaction.count as jest.Mock).mockImplementation(async () => 1);
      (prisma.transaction.findFirst as jest.Mock).mockImplementation(async () => null);


      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          categoryId,
          amount: 50.0,
          type: 'EXPENSE',
          merchant: 'Starbucks',
          description: 'Coffee',
        });

      expect(response.status).toBe(201);
      expect(response.body.transaction.id).toBe(mockTx.id);
      expect(response.body.fraudFlags).toBeDefined();


    });

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).post('/api/v1/transactions').send({});
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('should list user transactions with pagination and return 200', async () => {
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTx]);
      (prisma.transaction.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('should return transaction by ID for owner', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTx);

      const response = await request(app)
        .get(`/api/v1/transactions/${txId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(mockTx.id);
    });

    it('should enforce ownership isolation and return 404 for different user', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/transactions/${txId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/transactions/:id', () => {
    it('should delete transaction for owner', async () => {
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTx);
      (prisma.transaction.delete as jest.Mock).mockResolvedValue(mockTx);

      const response = await request(app)
        .delete(`/api/v1/transactions/${txId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });
  });
});
