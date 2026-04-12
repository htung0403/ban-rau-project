import axiosClient from './axiosClient';
import type { Customer } from '../types';

export const customersApi = {
  getAll: async (type?: string) => {
    const { data } = await axiosClient.get<Customer[]>('/customers', { params: { type } });
    return data;
  },

  create: async (payload: { name: string; phone?: string; address?: string; customer_type?: string }) => {
    const { data } = await axiosClient.post<Customer>('/customers', payload);
    return data;
  },

  update: async (id: string, payload: { name?: string; phone?: string | null; address?: string | null; customer_type?: string }) => {
    const { data } = await axiosClient.put<Customer>(`/customers/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await axiosClient.delete(`/customers/${id}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await axiosClient.get<Customer>(`/customers/${id}`);
    return data;
  },
  
  getByUserId: async (userId: string) => {
    const { data } = await axiosClient.get<Customer>(`/customers/user/${userId}`);
    return data;
  },

  getOrders: async (id: string) => {
    const { data } = await axiosClient.get(`/customers/${id}/orders`);
    return data;
  },

  getExportOrders: async (id: string) => {
    const { data } = await axiosClient.get(`/customers/${id}/export-orders`);
    return data;
  },

  getReceipts: async (id: string) => {
    const { data } = await axiosClient.get(`/customers/${id}/receipts`);
    return data;
  },

  getDebt: async (id: string) => {
    const { data } = await axiosClient.get(`/customers/${id}/debt`);
    return data;
  },

  updatePayment: async (id: string, payload: { amount: number, payment_date?: string, payment_time?: string, collector_id?: string, notes?: string }) => {
    const { data } = await axiosClient.put(`/customers/${id}/payment`, payload);
    return data;
  },

  createAccount: async (payload: { customer_id: string; email: string; password: string }) => {
    const { data } = await axiosClient.post('/customers/create-account', payload);
    return data;
  },
};
