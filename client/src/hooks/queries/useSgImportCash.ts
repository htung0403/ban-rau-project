import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '../../api/accountingApi';
import toast from 'react-hot-toast';

export const sgImportCashKeys = {
  all: ['sg-import-cash'] as const,
  list: (from?: string, to?: string) => [...sgImportCashKeys.all, 'list', from, to] as const,
  detail: (id: string) => [...sgImportCashKeys.all, 'detail', id] as const,
};

export function useSgImportCashList(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: sgImportCashKeys.list(params?.from, params?.to),
    queryFn: () => accountingApi.getSgImportCash(params),
  });
}

export function useSgImportCashOrderDetail(id: string | null) {
  return useQuery({
    queryKey: sgImportCashKeys.detail(id || ''),
    queryFn: () => accountingApi.getSgImportCashOrder(id!),
    enabled: !!id,
  });
}

export function useConfirmSgHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importOrderId: string) => accountingApi.confirmSgHandover(importOrderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sgImportCashKeys.all });
      toast.success('Đã xác nhận nhận tiền');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      toast.error(msg || 'Không xác nhận được');
    },
  });
}
