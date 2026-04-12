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

  getSgImportCash: async (params?: { from?: string; to?: string }) => {
    const q: Record<string, string> = {};
    if (params?.from) q.from = params.from;
    if (params?.to) q.to = params.to;
    const { data } = await axiosClient.get('/accounting/sg-import-cash', { params: q });
    return data;
  },

  confirmSgHandover: async (importOrderId: string) => {
    const { data } = await axiosClient.patch(`/accounting/sg-import-cash/${importOrderId}/confirm-handover`);
    return data;
  },
};
