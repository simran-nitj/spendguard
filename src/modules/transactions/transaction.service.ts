import { FraudFlag, Transaction } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { TransactionRepository, transactionRepository, TransactionFilters, TransactionSort } from './transaction.repository';
import { CategoryRepository, categoryRepository } from '../categories/category.repository';
import { FraudDetectionService, fraudDetectionService } from '../fraud/fraudDetection.service';
import { CreateTransactionInput, UpdateTransactionInput, TransactionQueryInput } from './transaction.schemas';
import { BadRequestError, NotFoundError } from '../../errors/AppError';
import { getPaginationParams, buildPaginatedResponse, PaginatedResult } from '../../utils/pagination';

export interface CreateTransactionResult {
  transaction: Transaction;
  fraudFlags: FraudFlag[];
}

export class TransactionService {
  constructor(
    private txRepo: TransactionRepository = transactionRepository,
    private categoryRepo: CategoryRepository = categoryRepository,
    private fraudService: FraudDetectionService = fraudDetectionService,
  ) {}

  async createTransaction(
    userId: string,
    input: CreateTransactionInput,
  ): Promise<CreateTransactionResult> {
    const category = await this.categoryRepo.findById(input.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    if (category.userId !== null && category.userId !== userId) {
      throw new BadRequestError('Selected category is not accessible.');
    }

    if (category.type !== input.type) {
      throw new BadRequestError(
        `Category type (${category.type}) does not match transaction type (${input.type}).`,
      );
    }

    const occurredAtDate = input.occurredAt ? new Date(input.occurredAt) : new Date();

    // Execute transaction creation and fraud detection inside a single DB transaction
    const result = await prisma.$transaction(async (txClient) => {
      const createdTx = await this.txRepo.create(
        {
          userId,
          categoryId: input.categoryId,
          amount: input.amount,
          type: input.type,
          merchant: input.merchant,
          description: input.description,
          occurredAt: occurredAtDate,
        },
        txClient,
      );

      const flags = await this.fraudService.evaluateAndFlag(txClient, {
        id: createdTx.id,
        userId: createdTx.userId,
        amount: Number(createdTx.amount),
        type: createdTx.type,
        merchant: createdTx.merchant,
        occurredAt: createdTx.occurredAt,
      });

      return { transaction: createdTx, fraudFlags: flags };
    });

    return result;
  }

  async getTransactions(
    userId: string,
    query: TransactionQueryInput,
  ): Promise<PaginatedResult<Transaction>> {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const filters: TransactionFilters = {
      type: query.type,
      categoryId: query.categoryId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      merchant: query.merchant,
    };

    const sort: TransactionSort = {
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const { transactions, total } = await this.txRepo.findManyForUser(
      userId,
      filters,
      skip,
      limit,
      sort,
    );

    return buildPaginatedResponse(transactions, total, page, limit);
  }

  async getTransactionById(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.txRepo.findByIdForUser(id, userId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found.');
    }
    return transaction;
  }

  async updateTransaction(
    userId: string,
    id: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction> {
    const existing = await this.txRepo.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Transaction not found.');
    }

    if (input.categoryId) {
      const category = await this.categoryRepo.findById(input.categoryId);
      if (!category) {
        throw new NotFoundError('Category not found.');
      }
      if (category.userId !== null && category.userId !== userId) {
        throw new BadRequestError('Selected category is not accessible.');
      }
      const targetType = input.type || existing.type;
      if (category.type !== targetType) {
        throw new BadRequestError(
          `Category type (${category.type}) does not match transaction type (${targetType}).`,
        );
      }
    }

    const updated = await this.txRepo.updateForUser(id, userId, {
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      merchant: input.merchant,
      description: input.description,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
    });

    return updated;
  }

  async deleteTransaction(userId: string, id: string): Promise<{ message: string }> {
    const existing = await this.txRepo.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Transaction not found.');
    }

    await this.txRepo.deleteForUser(id, userId);
    return { message: 'Transaction deleted successfully.' };
  }
}

export const transactionService = new TransactionService();
