import React from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useLeaveRequests, useReviewLeaveRequest } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AddLeaveRequestDialog from './dialogs/AddLeaveRequestDialog';

const statusLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

const LeaveRequestsPage: React.FC = () => {
  const { user } = useAuth();
  // Filter by user ID if not manager/admin
  const requestUserId = ['admin', 'manager'].includes(user?.role || '') ? undefined : user?.id;

  const { data: requests, isLoading, isError, refetch } = useLeaveRequests(requestUserId);
  const reviewMutation = useReviewLeaveRequest();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewMutation.mutate({ id, payload: { status } });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Nghỉ phép"
        description="Quản lý đơn nghỉ phép"
        backPath="/hanh-chinh-nhan-su"
        actions={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Tạo đơn nghỉ
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={5} columns={5} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !requests?.length ? (
          <EmptyState title="Chưa có đơn nghỉ phép" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Từ ngày</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Đến ngày</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Lý do</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground">{r.profiles?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{r.from_date}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{r.to_date}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{r.reason || '-'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.status} label={statusLabels[r.status]} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleReview(r.id, 'rejected')}
                            disabled={reviewMutation.isPending}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 "
                            title="Hủy đơn"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddLeaveRequestDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
      />
    </div>
  );
};

export default LeaveRequestsPage;
