import axiosClient from './axiosClient';
import type { 
  CreatePaymentCollectionDto, 
  SubmitPaymentDto, 
  UpdatePaymentCollectionDto, 
  ConfirmPaymentDto,
  PaymentCollectionStatus,
  PaymentCollection
} from '../types';

export interface GetPaymentCollectionsParams {
  driverId?: string;
  status?: PaymentCollectionStatus;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

const paymentCollectionsApi = {
  getAll: async (params?: GetPaymentCollectionsParams) => {
    const { data } = await axiosClient.get<PaymentCollection[]>('/payment-collections', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await axiosClient.get<PaymentCollection>(`/payment-collections/${id}`);
    return data;
  },

  getSummaryByVehicle: async (params?: SummaryParams) => {
    const { data } = await axiosClient.get<PaymentCollection[]>('/payment-collections/summary/by-vehicle', { params });
    return data;
  },

  create: async (payload: CreatePaymentCollectionDto) => {
    const { data } = await axiosClient.post<PaymentCollection>('/payment-collections', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePaymentCollectionDto) => {
    const { data } = await axiosClient.put<PaymentCollection>(`/payment-collections/${id}`, payload);
    return data;
  },

  submit: async (id: string, payload: SubmitPaymentDto) => {
    const { data } = await axiosClient.post<PaymentCollection>(`/payment-collections/${id}/submit`, payload);
    return data;
  },

  selfConfirm: async (id: string, reason: string) => {
    const { data } = await axiosClient.post<PaymentCollection>(`/payment-collections/${id}/self-confirm`, { reason });
    return data;
  },

  confirm: async (id: string, payload: ConfirmPaymentDto) => {
    const { data } = await axiosClient.post<PaymentCollection>(`/payment-collections/${id}/confirm`, payload);
    return data;
  },

  revert: async (id: string) => {
    const { data } = await axiosClient.post<PaymentCollection>(`/payment-collections/${id}/revert`);
    return data;
  },
};

export default paymentCollectionsApi;
