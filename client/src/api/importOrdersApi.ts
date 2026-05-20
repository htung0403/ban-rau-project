import axiosClient from './axiosClient';
import type { ImportOrder, ImportOrderCreatePayload, ImportOrderFilters } from '../types';

export interface PaginatedImportOrders {
  data: ImportOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export const importOrdersApi = {
  getAll: async (filters?: ImportOrderFilters & { page?: number; pageSize?: number }) => {
    const { data } = await axiosClient.get<PaginatedImportOrders>('/import-orders', { params: filters });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await axiosClient.get<ImportOrder>(`/import-orders/${id}`);
    return data;
  },

  getNextSequence: async (date: string) => {
    const { data } = await axiosClient.get<{ sequence: number; code: string }>('/import-orders/daily-sequence', { params: { date } });
    return data;
  },

  create: async (payload: ImportOrderCreatePayload) => {
    const { data } = await axiosClient.post<ImportOrder>('/import-orders', payload);
    return data;
  },

  update: async (id: string, payload: Partial<ImportOrderCreatePayload>) => {
    const { data } = await axiosClient.put<ImportOrder>(`/import-orders/${id}`, payload);
    return data;
  },

  confirmByAdmin: async (id: string, payload?: { order_category?: 'standard' | 'vegetable' }) => {
    const { data } = await axiosClient.patch<ImportOrder>(`/import-orders/${id}/admin-confirm`, payload || {});
    return data;
  },

  delete: async (id: string) => {
    const { data } = await axiosClient.delete(`/import-orders/${id}`);
    return data;
  },
};
