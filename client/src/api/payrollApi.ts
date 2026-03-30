import axiosClient from './axiosClient';
import type { Payroll } from '../types';

export const payrollApi = {
  getAll: async () => {
    const { data } = await axiosClient.get<Payroll[]>('/payroll');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await axiosClient.get<Payroll>(`/payroll/${id}`);
    return data;
  },

  generate: async (weekStart: string) => {
    const { data } = await axiosClient.post<Payroll[]>('/payroll/generate', { week_start: weekStart });
    return data;
  },

  confirm: async (id: string) => {
    const { data } = await axiosClient.put<Payroll>(`/payroll/${id}/confirm`);
    return data;
  },
};
