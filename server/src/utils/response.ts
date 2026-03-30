import { ApiResponse, PaginationMeta } from '../types';

export const successResponse = <T>(data: T, message?: string, meta?: PaginationMeta): ApiResponse<T> => ({
  success: true,
  message,
  data,
  meta,
});

export const errorResponse = (error: string, code?: string): ApiResponse => ({
  success: false,
  error,
  code,
});
