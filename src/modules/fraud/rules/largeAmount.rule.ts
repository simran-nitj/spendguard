import { CategoryType, FraudRule, FraudSeverity, Prisma } from '@prisma/client';
import { env } from '../../../config/env';

export interface FraudRuleResult {
  rule: FraudRule;
  severity: FraudSeverity;
  reason: string;
}

export const checkLargeAmountRule = async (
  txClient: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: CategoryType,
  occurredAt: Date,
): Promise<FraudRuleResult | null> => {
  if (type !== CategoryType.EXPENSE) return null;

  const minThreshold = env.FRAUD_LARGE_AMOUNT_MIN_THRESHOLD;
  const thirtyDaysAgo = new Date(occurredAt.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate user expense transactions over last 30 days prior to current transaction
  const aggregateResult = await txClient.transaction.aggregate({
    _avg: { amount: true },
    _count: { id: true },
    where: {
      userId,
      type: CategoryType.EXPENSE,
      occurredAt: {
        gte: thirtyDaysAgo,
        lt: occurredAt,
      },
    },
  });

  const avgExpense = aggregateResult._avg.amount ? Number(aggregateResult._avg.amount) : 0;
  const count = aggregateResult._count.id;

  // Only trigger if amount > 3x average AND amount > minThreshold (or if count > 0 and 3x average)
  if (count > 0 && avgExpense > 0) {
    if (amount > 3 * avgExpense && amount > minThreshold) {
      const isHighSeverity = amount > 10 * avgExpense;
      const severity = isHighSeverity ? FraudSeverity.HIGH : FraudSeverity.MEDIUM;
      return {
        rule: FraudRule.LARGE_AMOUNT,
        severity,
        reason: `Transaction amount ($${amount.toFixed(2)}) is ${isHighSeverity ? 'more than 10x' : 'over 3x'} the 30-day average expense ($${avgExpense.toFixed(2)}) and exceeds minimum threshold ($${minThreshold}).`,
      };
    }
  } else if (amount > minThreshold * 2) {
    // If no prior 30-day expenses exist, trigger if amount is unusually large
    return {
      rule: FraudRule.LARGE_AMOUNT,
      severity: FraudSeverity.HIGH,
      reason: `First large expense transaction ($${amount.toFixed(2)}) exceeds $${minThreshold * 2} limit.`,
    };
  }

  return null;
};
