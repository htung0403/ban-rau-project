import React from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { usePayrolls, useGeneratePayroll, useConfirmPayroll } from '../../hooks/queries/usePayroll';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Calculator, Lock, Printer } from 'lucide-react';
import { useState } from 'react';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  confirmed: 'Đã chốt',
  paid: 'Đã trả lương',
};

const PayrollPage: React.FC = () => {
  const { data: payrolls, isLoading, isError, refetch } = usePayrolls();
  const generateMutation = useGeneratePayroll();
  const confirmMutation = useConfirmPayroll();
  const [weekStart, setWeekStart] = useState('');

  const handleGenerate = () => {
    if (!weekStart) return;
    generateMutation.mutate(weekStart);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Bảng lương"
        description="Tính lương và chốt lương nhân viên"
        backPath="/hanh-chinh-nhan-su"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="px-3 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
              placeholder="Tuần bắt đầu"
            />
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !weekStart}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              <Calculator size={16} />
              Tạo bảng lương
            </button>
          </div>
        }
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={8} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !payrolls?.length ? (
          <EmptyState title="Chưa có bảng lương" description="Chọn tuần bắt đầu và nhấn 'Tạo bảng lương' để bắt đầu." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Tuần</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Ngày công</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Lương/ngày</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Tổng lương</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Tạm ứng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Thực nhận</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground">{p.profiles?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground tabular-nums">{p.week_start} - {p.week_end}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{p.days_worked}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground text-right tabular-nums">{formatCurrency(p.daily_wage)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{formatCurrency(p.gross_salary)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(p.total_advances)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(p.net_salary)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} label={statusLabels[p.status]} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {p.status === 'draft' && (
                          <button
                            onClick={() => confirmMutation.mutate(p.id)}
                            disabled={confirmMutation.isPending}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Chốt lương"
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => window.print()}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="In phiếu lương"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
