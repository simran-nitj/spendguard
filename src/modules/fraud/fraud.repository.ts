import { FraudFlag, FraudRule, FraudSeverity, FraudStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class FraudRepository {
  async createFlag(
    data: {
      transactionId: string;
      userId: string;
      rule: FraudRule;
      severity: FraudSeverity;
      reason: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<FraudFlag> {
    const client = tx || prisma;
    return client.fraudFlag.create({
      data: {
        transactionId: data.transactionId,
        userId: data.userId,
        rule: data.rule,
        severity: data.severity,
        reason: data.reason,
        status: FraudStatus.OPEN,
      },
    });
  }

  async findFlagsForUser(
    userId: string,
    filters: { status?: FraudStatus; severity?: FraudSeverity; skip?: number; limit?: number },
  ): Promise<{ flags: FraudFlag[]; total: number }> {
    const where: Prisma.FraudFlagWhereInput = {
      userId,
      ...(filters.status && { status: filters.status }),
      ...(filters.severity && { severity: filters.severity }),
    };

    const [flags, total] = await Promise.all([
      prisma.fraudFlag.findMany({
        where,
        include: {
          transaction: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.limit || 20,
      }),
      prisma.fraudFlag.count({ where }),
    ]);

    return { flags, total };
  }

  async findByIdAndUser(id: string, userId: string): Promise<FraudFlag | null> {
    return prisma.fraudFlag.findFirst({
      where: { id, userId },
    });
  }

  async updateStatus(
    id: string,
    status: FraudStatus,
  ): Promise<FraudFlag> {
    return prisma.fraudFlag.update({
      where: { id },
      data: {
        status,
        resolvedAt: status !== FraudStatus.OPEN ? new Date() : null,
      },
    });
  }
}

export const fraudRepository = new FraudRepository();
