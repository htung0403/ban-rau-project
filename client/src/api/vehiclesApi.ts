import axiosClient from './axiosClient';
import type { Vehicle, VehicleCheckin, PaymentCollection, DeliveryVehicle } from '../types';

export const vehiclesApi = {
  getAll: async () => {
    const { data } = await axiosClient.get<Vehicle[]>('/vehicles');
    return data;
  },

  create: async (payload: { license_plate: string; vehicle_type?: string; load_capacity_ton?: number; goods_categories?: Array<'grocery' | 'vegetable'>; driver_id?: string }) => {
    const { data } = await axiosClient.post<Vehicle>('/vehicles', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Vehicle>) => {
    const { data } = await axiosClient.put<Vehicle>(`/vehicles/${id}`, payload);
    return data;
  },

  checkin: async (id: string, payload: { checkin_type: 'in' | 'out'; latitude?: number; longitude?: number; address_snapshot?: string }) => {
    const { data } = await axiosClient.post<VehicleCheckin>(`/vehicles/${id}/checkin`, payload);
    return data;
  },

  getCheckins: async (id: string) => {
    const { data } = await axiosClient.get<VehicleCheckin[]>(`/vehicles/${id}/checkins`);
    return data;
  },

  collectPayment: async (payload: { vehicle_id: string; driver_id: string; amount: number; collected_date: string; collected_time: string; delivery_order_id?: string; notes?: string }) => {
    const { data } = await axiosClient.post<PaymentCollection>('/vehicles/collect-payment', payload);
    return data;
  },

  getCollections: async () => {
    const { data } = await axiosClient.get<PaymentCollection[]>('/vehicles/collections');
    return data;
  },
  
  getAssignments: async (id: string) => {
    const { data } = await axiosClient.get<DeliveryVehicle[]>(`/vehicles/${id}/assignments`);
    return data;
  },
};
