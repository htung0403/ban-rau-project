import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';

export interface Unit {
  id: string;
  name: string;
}

export const useUnits = (enabled = true) => {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/units');
      return data || [];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await axiosClient.post('/units', { name });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['units'], (old: Unit[] | undefined) => {
        if (!old) return [data];
        const exists = old.find(u => u.name === data.name);
        if (exists) return old;
        return [...old, data].sort((a, b) => a.name.localeCompare(b.name));
      });
    },
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosClient.delete(`/units/${id}`);
      return data;
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['units'], (old: Unit[] | undefined) => {
        if (!old) return old;
        return old.filter(u => u.id !== deletedId);
      });
      toast.success('Xóa đơn vị tính thành công');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Có lỗi xảy ra khi xóa đơn vị tính');
    },
  });
};
