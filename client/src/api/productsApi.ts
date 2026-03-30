import axiosClient from './axiosClient';

export const productsApi = {
  getAll: () => axiosClient.get('/products'),
  getById: (id: string) => axiosClient.get(`/products/${id}`),
  create: (data: any) => axiosClient.post('/products', data),
  update: (id: string, data: any) => axiosClient.put(`/products/${id}`, data),
  delete: (id: string) => axiosClient.delete(`/products/${id}`),
};
