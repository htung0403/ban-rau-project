import axiosClient from './axiosClient';
import type { ExportOrder } from '../types';

export const exportOrdersApi = {
  getAll: async () => {
    const { data } = await axiosClient.get<ExportOrder[]>('/export-orders');
    return data;
  },

  create: async (payload: Omit<ExportOrder, 'id' | 'created_at' | 'created_by'>) => {
    const { data } = await axiosClient.post<ExportOrder>('/export-orders', payload);
    return data;
  },

  updatePayment: async (id: string, payload: { paid_amount: number; payment_status: string }) => {
    const { data } = await axiosClient.put<ExportOrder>(`/export-orders/${id}/payment`, payload);
    return data;
  },
};
