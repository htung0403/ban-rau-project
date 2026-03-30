import axiosClient from './axiosClient';

export const accountingApi = {
  getDebts: async () => {
    const { data } = await axiosClient.get('/accounting/debts');
    return data;
  },

  getRevenueByDate: async (params?: { from?: string; to?: string }) => {
    const { data } = await axiosClient.get('/accounting/revenue/by-date', { params });
    return data;
  },

  getRevenueByVehicle: async (params?: { from?: string; to?: string }) => {
    const { data } = await axiosClient.get('/accounting/revenue/by-vehicle', { params });
    return data;
  },
};
