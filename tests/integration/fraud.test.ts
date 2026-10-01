import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { FraudRule, FraudSeverity, FraudStatus } from '@prisma/client';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    fraudFlag: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Fraud Endpoints (Integration)', () => {
  const userId = '10000000-0000-0000-0000-000000000001';
  const flagId = '33333333-3333-3333-3333-333333333333';
  const txId = '22222222-2222-2222-2222-222222222222';

  const validToken = jwt.sign(
    { sub: userId, email: 'user@example.com' },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_super_secure_key_min_32_chars',
  );

  const mockFlag = {
    id: flagId,
    transactionId: txId,
    userId,
    rule: FraudRule.LARGE_AMOUNT,
    severity: FraudSeverity.HIGH,
    reason: 'Transaction amount exceeds 3x 30-day expense average.',
    status: FraudStatus.OPEN,
    createdAt: new Date(),
    resolvedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/fraud/flags', () => {
    it('should list fraud flags filtered by status and severity', async () => {
      (prisma.fraudFlag.findMany as jest.Mock).mockResolvedValue([mockFlag]);
      (prisma.fraudFlag.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/fraud/flags?status=OPEN&severity=HIGH')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].rule).toBe('LARGE_AMOUNT');
    });
  });

  describe('PATCH /api/v1/fraud/flags/:id', () => {
    it('should update flag status to REVIEWED', async () => {
      (prisma.fraudFlag.findFirst as jest.Mock).mockResolvedValue(mockFlag);
      (prisma.fraudFlag.update as jest.Mock).mockResolvedValue({
        ...mockFlag,
        status: FraudStatus.REVIEWED,
        resolvedAt: new Date(),
      });

      const response = await request(app)
        .patch(`/api/v1/fraud/flags/${flagId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'REVIEWED' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('REVIEWED');
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app)
        .patch(`/api/v1/fraud/flags/${flagId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });
});
