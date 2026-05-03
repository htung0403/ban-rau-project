import axiosClient from './axiosClient';
import type { ExportOrder, PaginationMeta } from '../types';

export interface ExportOrdersResponse {
  data: ExportOrder[];
  meta: PaginationMeta;
}

export const exportOrdersApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    console.log('[exportOrdersApi.getAll] Fetching /export-orders...', params);
    try {
      const response = await axiosClient.get<ExportOrder[]>('/export-orders', {
        params: { page: params?.page, limit: params?.limit },
      });
      console.log('[exportOrdersApi.getAll] Success, received:', response.data, 'meta:', (response as any).meta);
      return {
        data: response.data,
        meta: (response as any).meta,
      } as ExportOrdersResponse;
    } catch (error: any) {
      console.error('[exportOrdersApi.getAll] Error:', error);
      console.error('[exportOrdersApi.getAll] Response:', error.response?.data);
      console.error('[exportOrdersApi.getAll] Status:', error.response?.status);
      throw error;
    }
  },

  create: async (payload: Omit<ExportOrder, 'id' | 'created_at' | 'created_by'>) => {
    const { data } = await axiosClient.post<ExportOrder>('/export-orders', payload);
    return data;
  },

  updatePayment: async (id: string, payload: { paid_amount: number; payment_status: string }) => {
    const { data } = await axiosClient.put<ExportOrder>(`/export-orders/${id}/payment`, payload);
    return data;
  },

  deleteMany: async (ids: string[]) => {
    const { data } = await axiosClient.post('/export-orders/bulk-delete', { ids });
    return data;
  },
};
