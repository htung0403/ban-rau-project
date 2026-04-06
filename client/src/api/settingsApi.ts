import axiosClient from './axiosClient';
import type { PriceSetting, RoleSalary } from '../types';

export const settingsApi = {
  getPrices: async () => {
    const { data } = await axiosClient.get<PriceSetting[]>('/settings/prices');
    return data;
  },

  updatePrice: async (key: string, payload: { value: number; description?: string }) => {
    const { data } = await axiosClient.put<PriceSetting>(`/settings/prices/${key}`, payload);
    return data;
  },

  // Role Salaries
  getRoleSalaries: async () => {
    const { data } = await axiosClient.get<RoleSalary[]>('/settings/roles');
    return data;
  },

  upsertRoleSalary: async (payload: { role_key: string; role_name: string; daily_wage: number; description?: string }) => {
    const { data } = await axiosClient.post<RoleSalary>('/settings/roles', payload);
    return data;
  },

  deleteRoleSalary: async (key: string) => {
    const { data } = await axiosClient.delete(`/settings/roles/${key}`);
    return data;
  },

  // General Settings
  getGeneralSettings: async () => {
    const { data } = await axiosClient.get<any[]>('/settings/general');
    return data;
  },

  getGeneralSettingByKey: async (key: string) => {
    const { data } = await axiosClient.get<any>(`/settings/general/${key}`);
    return data;
  },

  upsertGeneralSetting: async (key: string, payload: { value: any; description?: string }) => {
    const { data } = await axiosClient.put<any>(`/settings/general/${key}`, payload);
    return data;
  },
};
