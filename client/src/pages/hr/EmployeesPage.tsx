import React from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useEmployees } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Users } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Admin', manager: 'Quản lý', staff: 'Nhân viên', driver: 'Tài xế',
};

const EmployeesPage: React.FC = () => {
  const { data: employees, isLoading, isError, refetch } = useEmployees();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader title="Nhân sự" description="Danh sách nhân viên" backPath="/hanh-chinh-nhan-su" />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={4} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !employees?.length ? (
          <EmptyState title="Chưa có nhân viên" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Họ tên</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">SDT</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Vai trò</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Users size={16} className="text-primary" />
                        </div>
                        <span className="text-[13px] font-bold text-foreground">{e.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{e.phone || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {roleLabels[e.role] || e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${e.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${e.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {e.is_active ? 'Hoạt động' : 'Ngừng'}
                      </span>
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

export default EmployeesPage;
