import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/productsApi';
import type { Product } from '../../types';
import toast from 'react-hot-toast';

/** Tách mặt hàng tạp hóa (standard) và rau (vegetable) — không dùng chung danh sách. */
export type ProductListScope = 'all' | 'standard' | 'vegetable';

/** Dùng chung cho form nhập hàng / merge dòng khi sửa — tránh lẫn rau ↔ tạp hóa. */
export function productMatchesScope(
  p: { category?: string | null },
  scope: 'standard' | 'vegetable',
): boolean {
  if (scope === 'vegetable') return p.category === 'vegetable';
  return p.category !== 'vegetable';
}

function filterProductsByScope(data: Product[], scope: ProductListScope): Product[] {
  if (scope === 'vegetable') return data.filter((p) => p.category === 'vegetable');
  if (scope === 'standard') return data.filter((p) => p.category !== 'vegetable');
  return data;
}

export const useProducts = (enabled = true, scope: ProductListScope = 'all') => {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productsApi.getAll();
      return (response.data || []) as Product[];
    },
    enabled,
  });

  const data = useMemo(() => {
    if (!query.data) return undefined;
    return filterProductsByScope(query.data, scope);
  }, [query.data, scope]);

  return { ...query, data };
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Thêm hàng hóa thành công');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Cập nhật hàng hóa thành công');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Xóa hàng hóa thành công');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    },
  });
};
