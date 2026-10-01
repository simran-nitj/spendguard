export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const getPaginationParams = (queryPage?: any, queryLimit?: any): PaginationParams => {
  const page = Math.max(1, parseInt(String(queryPage || 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(queryLimit || 20), 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
