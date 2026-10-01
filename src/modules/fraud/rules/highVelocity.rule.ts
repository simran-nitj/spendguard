import { CategoryType, FraudRule, FraudSeverity, Prisma } from '@prisma/client';
import { FraudRuleResult } from './largeAmount.rule';

export const checkHighVelocityRule = async (
  txClient: Prisma.TransactionClient,
  userId: string,
  _amount: number,
  type: CategoryType,
  occurredAt: Date,
): Promise<FraudRuleResult | null> => {
  if (type !== CategoryType.EXPENSE) return null;

  const tenMinutesAgo = new Date(occurredAt.getTime() - 10 * 60 * 1000);

  const count = await txClient.transaction.count({
    where: {
      userId,
      occurredAt: {
        gte: tenMinutesAgo,
        lte: occurredAt,
      },
    },
  });

  if (count > 5) {
    return {
      rule: FraudRule.HIGH_VELOCITY,
      severity: FraudSeverity.MEDIUM,
      reason: `High velocity detected: ${count} transactions created within a 10-minute window.`,
    };
  }

  return null;
};
