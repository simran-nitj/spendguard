import { FraudFlag } from '@prisma/client';
import { FraudRepository, fraudRepository } from './fraud.repository';
import { FraudQueryInput, UpdateFraudFlagInput } from './fraud.schemas';
import { NotFoundError } from '../../errors/AppError';
import { getPaginationParams, buildPaginatedResponse, PaginatedResult } from '../../utils/pagination';

export class FraudManagementService {
  constructor(private repo: FraudRepository = fraudRepository) {}

  async getFlags(userId: string, query: FraudQueryInput): Promise<PaginatedResult<FraudFlag>> {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const { flags, total } = await this.repo.findFlagsForUser(userId, {
      status: query.status,
      severity: query.severity,
      skip,
      limit,
    });

    return buildPaginatedResponse(flags, total, page, limit);
  }

  async updateFlagStatus(
    userId: string,
    id: string,
    input: UpdateFraudFlagInput,
  ): Promise<FraudFlag> {
    const flag = await this.repo.findByIdAndUser(id, userId);
    if (!flag) {
      throw new NotFoundError('Fraud flag not found.');
    }

    return this.repo.updateStatus(id, input.status);
  }
}

export const fraudManagementService = new FraudManagementService();
