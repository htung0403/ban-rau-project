import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ExternalLink, RefreshCw, SendHorizonal } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import { DatePicker } from '../../components/shared/DatePicker';
import { zaloSummaryApi, type ZaloSummaryStatusItem, type ZaloSummaryType } from '../../api/zaloSummaryApi';

type Props = {
  type: ZaloSummaryType;
  title: string;
  description: string;
  backPath?: string;
};

const statusClassMap: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  skipped: 'bg-amber-100 text-amber-700 border-amber-200',
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusLabelMap: Record<string, string> = {
  success: 'Đã gửi',
  failed: 'Thất bại',
  skipped: 'Bỏ qua',
  pending: 'Chưa gửi',
};

const triggerLabelMap: Record<string, string> = {
  scheduler: 'Tự động',
  manual: 'Thủ công',
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '-';
  return format(time, 'dd/MM/yyyy HH:mm:ss');
};

const summaryTypeLabelMap: Record<ZaloSummaryType, string> = {
  grocery: 'khách tạp hóa',
  supplier: 'vựa rau',
  sender: 'người gửi rau',
};

const SummaryStatCard: React.FC<{ label: string; value: number; colorClass?: string }> = ({ label, value, colorClass }) => (
  <div className={`rounded-xl border border-border/60 bg-card p-3 ${colorClass || ''}`}>
    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-black text-foreground tabular-nums mt-1">{value}</div>
  </div>
);

const ZaloSummaryDispatchPage: React.FC<Props> = ({ type, title, description, backPath = '/cai-dat-he-thong' }) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['zalo-summary-status', type, date],
    queryFn: () => zaloSummaryApi.getSummaryStatus(type, date),
  });

  const sendMutation = useMutation({
    mutationFn: (item: ZaloSummaryStatusItem) =>
      zaloSummaryApi.sendSummary({
        type,
        targetId: item.targetId,
        date,
      }),
    onSuccess: (response, item) => {
      if (response.success) {
        toast.success(`Đã gửi tổng kết cho ${item.targetName}`);
      } else {
        toast.error(response.error || `Không gửi được tổng kết cho ${item.targetName}`);
      }
      void queryClient.invalidateQueries({ queryKey: ['zalo-summary-status', type, date] });
    },
    onError: () => {
      toast.error('Gửi tổng kết thất bại');
    },
  });

  const items = data?.items || [];
  const stats = data?.summary || { total: 0, sent: 0, failed: 0, skipped: 0, pending: 0 };

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.status === b.status) return a.targetName.localeCompare(b.targetName, 'vi');
        const order = ['failed', 'pending', 'skipped', 'success'];
        return order.indexOf(a.status) - order.indexOf(b.status);
      }),
    [items],
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader title={title} description={description} backPath={backPath} />
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-muted-foreground">Ngày tổng kết</span>
            <DatePicker
              value={date}
              onChange={setDate}
              className="h-10 bg-white min-w-[160px]"
            />
          </label>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="h-16 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không tải được danh sách tổng kết. Vui lòng thử lại.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <SummaryStatCard label="Tổng khách" value={stats.total} />
            <SummaryStatCard label="Đã gửi" value={stats.sent} colorClass="bg-emerald-50/70" />
            <SummaryStatCard label="Thất bại" value={stats.failed} colorClass="bg-red-50/70" />
            <SummaryStatCard label="Bỏ qua" value={stats.skipped} colorClass="bg-amber-50/70" />
            <SummaryStatCard label="Chưa gửi" value={stats.pending} colorClass="bg-slate-50/70" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden min-h-0">
            <div
              className="overflow-auto max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-340px)] custom-scrollbar pb-3"
              style={{ scrollbarGutter: 'stable both-edges' }}
            >
              <table className="w-full min-w-[980px] text-sm mb-2">
                <thead className="bg-white border-b border-border/60 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">Khách hàng</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">SĐT</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">Số đơn</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground">Dòng hàng</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-muted-foreground">Trạng thái</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">Lần gửi gần nhất</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">Lỗi</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        Không có dữ liệu {summaryTypeLabelMap[type]} trong ngày đã chọn.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item, index) => {
                      const isSending = sendMutation.isPending && sendMutation.variables?.targetId === item.targetId;
                      return (
                        <tr key={item.targetId} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">{index + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-foreground">{item.targetName || '-'}</div>
                          </td>
                          <td className="px-3 py-2 text-foreground">{item.targetPhone || '-'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.orderCount}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.itemRowCount}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${statusClassMap[item.status]}`}>
                              {statusLabelMap[item.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            <div>{formatDateTime(item.lastSentAt)}</div>
                            <div>{item.triggeredBy ? triggerLabelMap[item.triggeredBy] : '-'}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-red-600 max-w-[260px] break-words">{item.lastError || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => window.open(item.publicLink, '_blank', 'noopener,noreferrer')}
                                className="h-8 px-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={14} />
                                Mở link
                              </button>
                              <button
                                onClick={() => sendMutation.mutate(item)}
                                disabled={isSending}
                                className="h-8 px-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-60"
                              >
                                <SendHorizonal size={14} />
                                {isSending ? 'Đang gửi' : 'Gửi lại'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ZaloSummaryDispatchPage;
