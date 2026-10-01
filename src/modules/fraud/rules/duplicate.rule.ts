import { CategoryType, FraudRule, FraudSeverity, Prisma } from '@prisma/client';
import { FraudRuleResult } from './largeAmount.rule';

export const checkDuplicateRule = async (
  txClient: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: CategoryType,
  merchant: string,
  occurredAt: Date,
  currentTxId?: string,
): Promise<FraudRuleResult | null> => {
  if (type !== CategoryType.EXPENSE) return null;

  const twoMinutesAgo = new Date(occurredAt.getTime() - 2 * 60 * 1000);
  const twoMinutesAfter = new Date(occurredAt.getTime() + 2 * 60 * 1000);

  const duplicateTx = await txClient.transaction.findFirst({
    where: {
      userId,
      merchant: { equals: merchant, mode: 'insensitive' },
      amount,
      occurredAt: {
        gte: twoMinutesAgo,
        lte: twoMinutesAfter,
      },
      id: currentTxId ? { not: currentTxId } : undefined,
    },
  });

  if (duplicateTx) {
    return {
      rule: FraudRule.DUPLICATE,
      severity: FraudSeverity.LOW,
      reason: `Potential duplicate: matching merchant '${merchant}' and amount ($${amount.toFixed(2)}) within 2 minutes.`,
    };
  }

  return null;
};
