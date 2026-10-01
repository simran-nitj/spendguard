import { CategoryType, FraudFlag, Prisma } from '@prisma/client';
import { checkLargeAmountRule, FraudRuleResult } from './rules/largeAmount.rule';
import { checkHighVelocityRule } from './rules/highVelocity.rule';
import { checkDuplicateRule } from './rules/duplicate.rule';
import { checkNewMerchantHighValueRule } from './rules/newMerchantHighValue.rule';
import { FraudRepository, fraudRepository } from './fraud.repository';

export class FraudDetectionService {
  constructor(private repo: FraudRepository = fraudRepository) {}

  async evaluateAndFlag(
    txClient: Prisma.TransactionClient,
    transaction: {
      id: string;
      userId: string;
      amount: number;
      type: CategoryType;
      merchant: string;
      occurredAt: Date;
    },
  ): Promise<FraudFlag[]> {
    if (transaction.type !== CategoryType.EXPENSE) {
      return [];
    }

    const ruleChecks = await Promise.all([
      checkLargeAmountRule(
        txClient,
        transaction.userId,
        transaction.amount,
        transaction.type,
        transaction.occurredAt,
      ),
      checkHighVelocityRule(
        txClient,
        transaction.userId,
        transaction.amount,
        transaction.type,
        transaction.occurredAt,
      ),
      checkDuplicateRule(
        txClient,
        transaction.userId,
        transaction.amount,
        transaction.type,
        transaction.merchant,
        transaction.occurredAt,
        transaction.id,
      ),
      checkNewMerchantHighValueRule(
        txClient,
        transaction.userId,
        transaction.amount,
        transaction.type,
        transaction.merchant,
        transaction.id,
      ),
    ]);

    const triggeredRules: FraudRuleResult[] = ruleChecks.filter(
      (res): res is FraudRuleResult => res !== null,
    );

    const createdFlags: FraudFlag[] = [];
    for (const ruleResult of triggeredRules) {
      const flag = await this.repo.createFlag(
        {
          transactionId: transaction.id,
          userId: transaction.userId,
          rule: ruleResult.rule,
          severity: ruleResult.severity,
          reason: ruleResult.reason,
        },
        txClient,
      );
      createdFlags.push(flag);
    }

    return createdFlags;
  }
}

export const fraudDetectionService = new FraudDetectionService();
