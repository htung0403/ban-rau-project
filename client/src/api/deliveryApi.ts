import axiosClient from './axiosClient';
import type { DeliveryOrder } from '../types';

export const deliveryApi = {
  getAllToday: async (startDate?: string, endDate?: string) => {
    const { data } = await axiosClient.get<DeliveryOrder[]>('/delivery', {
      params: { startDate, endDate },
    });
    return data;
  },

  getInventory: async () => {
    const { data } = await axiosClient.get('/delivery/inventory');
    return data;
  },

  create: async (payload: { 
    import_order_id: string; 
    product_name: string; 
    total_quantity: number; 
    unit_price?: number; 
    import_cost?: number; 
    payment_method?: string;
    delivery_date?: string;
    vehicles?: Array<{
      vehicle_id: string;
      driver_id: string;
      quantity: number;
    }>;
  }) => {
    const { data } = await axiosClient.post<DeliveryOrder>('/delivery', payload);
    return data;
  },

  assignVehicle: async (id: string, payload: { vehicle_id: string; driver_id: string; quantity: number }) => {
    const { data } = await axiosClient.put(`/delivery/${id}/assign-vehicle`, payload);
    return data;
  },

  updateQty: async (id: string, payload: { delivered_quantity: number }) => {
    const { data } = await axiosClient.put(`/delivery/${id}/update-qty`, payload);
    return data;
  },
};
