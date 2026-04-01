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

  updateProfile: async (payload: { full_name?: string; avatar_url?: string }) => {
    const { data } = await axiosClient.put<void>('/auth/profile', payload);
    return data;
  },
};
