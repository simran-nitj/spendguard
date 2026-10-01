import { CategoryType, FraudRule, FraudSeverity } from '@prisma/client';
import { checkLargeAmountRule } from '../../src/modules/fraud/rules/largeAmount.rule';
import { checkHighVelocityRule } from '../../src/modules/fraud/rules/highVelocity.rule';
import { checkDuplicateRule } from '../../src/modules/fraud/rules/duplicate.rule';
import { checkNewMerchantHighValueRule } from '../../src/modules/fraud/rules/newMerchantHighValue.rule';

describe('Fraud Detection Rules (Unit)', () => {
  const userId = 'user-123';
  const now = new Date('2026-09-30T12:00:00.000Z');

  describe('checkLargeAmountRule', () => {
    it('should return null for INCOME transactions', async () => {
      const mockTxClient = {} as any;
      const res = await checkLargeAmountRule(mockTxClient, userId, 10000, CategoryType.INCOME, now);
      expect(res).toBeNull();
    });

    it('should trigger HIGH severity when amount > 10x average expense and > min threshold', async () => {
      const mockTxClient = {
        transaction: {
          aggregate: jest.fn().mockResolvedValue({
            _avg: { amount: 200 },
            _count: { id: 10 },
          }),
        },
      } as any;

      const res = await checkLargeAmountRule(mockTxClient, userId, 6000, CategoryType.EXPENSE, now);
      expect(res).not.toBeNull();
      expect(res?.rule).toBe(FraudRule.LARGE_AMOUNT);
      expect(res?.severity).toBe(FraudSeverity.HIGH);
    });

    it('should trigger MEDIUM severity when amount > 3x average but <= 10x average', async () => {
      const mockTxClient = {
        transaction: {
          aggregate: jest.fn().mockResolvedValue({
            _avg: { amount: 1500 },
            _count: { id: 10 },
          }),
        },
      } as any;

      const res = await checkLargeAmountRule(mockTxClient, userId, 5500, CategoryType.EXPENSE, now);
      expect(res).not.toBeNull();
      expect(res?.rule).toBe(FraudRule.LARGE_AMOUNT);
      expect(res?.severity).toBe(FraudSeverity.MEDIUM);
    });

    it('should NOT trigger if amount <= 3x average', async () => {
      const mockTxClient = {
        transaction: {
          aggregate: jest.fn().mockResolvedValue({
            _avg: { amount: 3000 },
            _count: { id: 10 },
          }),
        },
      } as any;

      const res = await checkLargeAmountRule(mockTxClient, userId, 6000, CategoryType.EXPENSE, now);
      expect(res).toBeNull();
    });
  });

  describe('checkHighVelocityRule', () => {
    it('should trigger MEDIUM severity if > 5 transactions in 10 minutes', async () => {
      const mockTxClient = {
        transaction: {
          count: jest.fn().mockResolvedValue(6),
        },
      } as any;

      const res = await checkHighVelocityRule(mockTxClient, userId, 50, CategoryType.EXPENSE, now);
      expect(res).not.toBeNull();
      expect(res?.rule).toBe(FraudRule.HIGH_VELOCITY);
      expect(res?.severity).toBe(FraudSeverity.MEDIUM);
    });

    it('should NOT trigger if <= 5 transactions in 10 minutes', async () => {
      const mockTxClient = {
        transaction: {
          count: jest.fn().mockResolvedValue(4),
        },
      } as any;

      const res = await checkHighVelocityRule(mockTxClient, userId, 50, CategoryType.EXPENSE, now);
      expect(res).toBeNull();
    });
  });

  describe('checkDuplicateRule', () => {
    it('should trigger LOW severity if duplicate transaction exists within 2 minutes', async () => {
      const mockTxClient = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'tx-old-1',
            merchant: 'Target',
            amount: 49.99,
          }),
        },
      } as any;

      const res = await checkDuplicateRule(
        mockTxClient,
        userId,
        49.99,
        CategoryType.EXPENSE,
        'Target',
        now,
        'tx-new-2',
      );

      expect(res).not.toBeNull();
      expect(res?.rule).toBe(FraudRule.DUPLICATE);
      expect(res?.severity).toBe(FraudSeverity.LOW);
    });

    it('should NOT trigger if no duplicate transaction is found within 2 minutes', async () => {
      const mockTxClient = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as any;

      const res = await checkDuplicateRule(
        mockTxClient,
        userId,
        49.99,
        CategoryType.EXPENSE,
        'Target',
        now,
      );

      expect(res).toBeNull();
    });
  });

  describe('checkNewMerchantHighValueRule', () => {
    it('should trigger MEDIUM severity if first-ever transaction with merchant and amount > threshold', async () => {
      const mockTxClient = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue(null), // No prior transaction
        },
      } as any;

      const res = await checkNewMerchantHighValueRule(
        mockTxClient,
        userId,
        15000,
        CategoryType.EXPENSE,
        'New Luxury Store',
      );

      expect(res).not.toBeNull();
      expect(res?.rule).toBe(FraudRule.NEW_MERCHANT_HIGH_VALUE);
      expect(res?.severity).toBe(FraudSeverity.MEDIUM);
    });

    it('should NOT trigger if user has prior transaction with merchant', async () => {
      const mockTxClient = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue({ id: 'tx-prior' }),
        },
      } as any;

      const res = await checkNewMerchantHighValueRule(
        mockTxClient,
        userId,
        15000,
        CategoryType.EXPENSE,
        'Existing Store',
      );

      expect(res).toBeNull();
    });

    it('should NOT trigger if amount <= threshold ($10,000)', async () => {
      const mockTxClient = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as any;

      const res = await checkNewMerchantHighValueRule(
        mockTxClient,
        userId,
        8000,
        CategoryType.EXPENSE,
        'New Merchant',
      );

      expect(res).toBeNull();
    });
  });
});
