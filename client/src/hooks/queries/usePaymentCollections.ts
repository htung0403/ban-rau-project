import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import paymentCollectionsApi from '../../api/paymentCollectionsApi';
import type { GetPaymentCollectionsParams, SummaryParams } from '../../api/paymentCollectionsApi';
import type { CreatePaymentCollectionDto, SubmitPaymentDto, ConfirmPaymentDto, UpdatePaymentCollectionDto } from '../../types';
import toast from 'react-hot-toast';

export const paymentCollectionKeys = {
  all: ['payment-collections'] as const,
  list: (filters?: GetPaymentCollectionsParams) => [...paymentCollectionKeys.all, 'list', filters] as const,
  detail: (id: string) => [...paymentCollectionKeys.all, 'detail', id] as const,
  summary: (filters?: SummaryParams) => [...paymentCollectionKeys.all, 'summary', filters] as const,
};

export function usePaymentCollections(filters?: GetPaymentCollectionsParams) {
  return useQuery({
    queryKey: paymentCollectionKeys.list(filters),
    queryFn: () => paymentCollectionsApi.getAll(filters),
  });
}

export function usePaymentCollectionById(id: string) {
  return useQuery({
    queryKey: paymentCollectionKeys.detail(id),
    queryFn: () => paymentCollectionsApi.getById(id),
    enabled: !!id,
  });
}

export function useVehicleCollectionSummary(filters?: SummaryParams) {
  return useQuery({
    queryKey: paymentCollectionKeys.summary(filters),
    queryFn: () => paymentCollectionsApi.getSummaryByVehicle(filters),
  });
}

export function useCreatePaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentCollectionDto) => paymentCollectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      toast.success('Tạo phiếu thu thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi tạo phiếu thu'),
  });
}

export function useUpdatePaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentCollectionDto }) => paymentCollectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      toast.success('Cập nhật phiếu thu thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi cập nhật phiếu thu'),
  });
}

export function useSubmitPaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmitPaymentDto }) => paymentCollectionsApi.submit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      toast.success('Đã nộp tiền thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi nộp tiền'),
  });
}

export function useSelfConfirmPaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => paymentCollectionsApi.selfConfirm(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // refresh debt
      toast.success('Tự xác nhận thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi tự xác nhận'),
  });
}

export function useConfirmPaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmPaymentDto }) => paymentCollectionsApi.confirm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // refresh debt
      toast.success('Đã xác nhận nhận tiền');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi xác nhận'),
  });
}

export function useRevertPaymentCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentCollectionsApi.revert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });
      toast.success('Đã hủy nộp tiền, quay về trạng thái chưa nộp');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi hủy nộp'),
  });
}
