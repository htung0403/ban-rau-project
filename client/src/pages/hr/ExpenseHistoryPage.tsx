import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useExpenses } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import type { Expense } from '../../types';

const VN_TZ = 'Asia/Ho_Chi_Minh';

function formatExpenseDateDisplay(raw: string): string {
  if (!raw) return '—';
  const ms = Date.parse(raw.length === 10 ? `${raw}T00:00:00+07:00` : raw);
  if (Number.isNaN(ms)) return raw;
  const d = new Date(ms);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, month: '2-digit' }).format(d);
  const year = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, year: 'numeric' }).format(d);
  const tp = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = (tp.find((x) => x.type === 'hour')?.value ?? '00').padStart(2, '0');
  const min = (tp.find((x) => x.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${min}`;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const ExpenseHistoryPage = () => {
  const { data: expenses, isLoading, isError, refetch } = useExpenses();

  const sorted = React.useMemo(() => {
    if (!expenses?.length) return [];
    return [...expenses].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [expenses]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Lịch sử chi phí"
          description="Danh sách phiếu theo thời điểm cập nhật gần nhất (hệ thống)."
          backPath="/chi-phi"
        />
      </div>

      <div className="bg-card rounded-2xl md:border md:border-border sm:shadow-sm flex flex-col flex-1 min-h-0 mt-0 md:mt-4">
        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton columns={6} rows={8} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !sorted.length ? (
          <EmptyState title="Chưa có dữ liệu chi phí" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-muted/30 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                      Cập nhật lần cuối
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-l border-border/50">
                      Tên chi phí
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-emerald-600 uppercase tracking-wider text-right border-b border-l border-border/50">
                      Số tiền
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-l border-border/50 whitespace-nowrap">
                      Ngày giờ chi
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center border-b border-l border-border/50">
                      TT thanh toán
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center border-b border-l border-border/50">
                      Xác nhận
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-l border-border/50 w-24">
                      Mở
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sorted.map((e: Expense) => (
                    <tr key={e.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 text-[13px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {format(new Date(e.updated_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 border-l border-border/30">
                        <div className="text-[14px] font-medium text-foreground">{e.expense_name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {e.employee?.full_name}
                          {e.vehicle?.license_plate && ` · ${e.vehicle.license_plate}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right border-l border-border/30 font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(Number(e.amount))}
                      </td>
                      <td className="px-4 py-3 border-l border-border/30 text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatExpenseDateDisplay(e.expense_date)}
                      </td>
                      <td className="px-4 py-3 text-center border-l border-border/30">
                        <StatusBadge
                          status={e.payment_status === 'unpaid' ? 'unpaid' : 'paid'}
                          label={e.payment_status === 'unpaid' ? 'Chưa thanh toán' : 'Đã thanh toán'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center border-l border-border/30">
                        <StatusBadge
                          status={e.payment_status === 'confirmed' ? 'approved' : 'pending'}
                          label={e.payment_status === 'confirmed' ? 'Đã xác nhận' : 'Chưa xác nhận'}
                        />
                      </td>
                      <td className="px-4 py-3 border-l border-border/30">
                        <Link
                          to="/chi-phi/phieu"
                          className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
                        >
                          Phiếu
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 p-3 sm:hidden pb-20">
              {sorted.map((e: Expense) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-border/60 bg-card p-3 text-[13px] space-y-2 shadow-sm"
                >
                  <div className="flex justify-between gap-2 items-start">
                    <span className="font-bold text-foreground leading-snug">{e.expense_name}</span>
                    <span className="text-emerald-600 font-black tabular-nums shrink-0">
                      {formatCurrency(Number(e.amount))}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Cập nhật: {format(new Date(e.updated_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge
                      status={e.payment_status === 'unpaid' ? 'unpaid' : 'paid'}
                      label={e.payment_status === 'unpaid' ? 'Chưa TT' : 'Đã TT'}
                    />
                    <StatusBadge
                      status={e.payment_status === 'confirmed' ? 'approved' : 'pending'}
                      label={e.payment_status === 'confirmed' ? 'Đã xác nhận' : 'Chưa xác nhận'}
                    />
                  </div>
                  <Link
                    to="/chi-phi/phieu"
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"
                  >
                    Mở trang phiếu chi phí
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistoryPage;
