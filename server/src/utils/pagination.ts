import { PaginationMeta } from '../types';

export const getPagination = (page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

export const getPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
  };
};
