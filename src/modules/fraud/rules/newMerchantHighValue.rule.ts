import { CategoryType, FraudRule, FraudSeverity, Prisma } from '@prisma/client';
import { env } from '../../../config/env';
import { FraudRuleResult } from './largeAmount.rule';

export const checkNewMerchantHighValueRule = async (
  txClient: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: CategoryType,
  merchant: string,
  currentTxId?: string,
): Promise<FraudRuleResult | null> => {
  if (type !== CategoryType.EXPENSE) return null;

  const threshold = env.FRAUD_NEW_MERCHANT_HIGH_VALUE_THRESHOLD;
  if (amount <= threshold) return null;

  // Check if user has any previous transaction with this merchant
  const priorTx = await txClient.transaction.findFirst({
    where: {
      userId,
      merchant: { equals: merchant, mode: 'insensitive' },
      id: currentTxId ? { not: currentTxId } : undefined,
    },
  });

  if (!priorTx) {
    return {
      rule: FraudRule.NEW_MERCHANT_HIGH_VALUE,
      severity: FraudSeverity.MEDIUM,
      reason: `First transaction with new merchant '${merchant}' has a high value of $${amount.toFixed(2)} (exceeds threshold of $${threshold}).`,
    };
  }

  return null;
};
