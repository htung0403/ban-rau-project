import axiosClient from './axiosClient';
import type { ImportOrder, ImportOrderCreatePayload, ImportOrderFilters } from '../types';

export const importOrdersApi = {
  getAll: async (filters?: ImportOrderFilters) => {
    const { data } = await axiosClient.get<ImportOrder[]>('/import-orders', { params: filters });
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

  delete: async (id: string) => {
    const { data } = await axiosClient.delete(`/import-orders/${id}`);
    return data;
  },
};
