import axiosClient from './axiosClient';
import type { Warehouse } from '../types';

export const warehouseApi = {
  getAll: async () => {
    const { data } = await axiosClient.get<Warehouse[]>('/warehouses');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await axiosClient.get<Warehouse>(`/warehouses/${id}`);
    return data;
  },

  create: async (payload: { name: string; address?: string; capacity?: number; manager_id?: string }) => {
    const { data } = await axiosClient.post<Warehouse>('/warehouses', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Warehouse>) => {
    const { data } = await axiosClient.put<Warehouse>(`/warehouses/${id}`, payload);
    return data;
  },
};
