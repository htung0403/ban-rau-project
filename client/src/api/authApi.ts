import axiosClient from './axiosClient';
import type { AuthResponse, LoginPayload, User } from '../types';

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await axiosClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  logout: async () => {
    const { data } = await axiosClient.post<void>('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await axiosClient.get<{ user: User }>('/auth/me');
    return data;
  },

  changePassword: async (newPassword: string) => {
    const { data } = await axiosClient.put<void>('/auth/change-password', { newPassword });
    return data;
  },

  updateProfile: async (payload: {
    full_name?: string;
    avatar_url?: string;
    phone?: string | null;
    date_of_birth?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
    citizen_id?: string | null;
    job_title?: string | null;
    department?: string | null;
    personal_email?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    city?: string | null;
    district?: string | null;
    ward?: string | null;
    address_line?: string | null;
    temporary_address?: string | null;
  }) => {
    const { data } = await axiosClient.put<void>('/auth/profile', payload);
    return data;
  },
};
