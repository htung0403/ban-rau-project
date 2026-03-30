import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useEmployees, useMarkAttendance } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { Check, X, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const AttendancePage: React.FC = () => {
  const { data: employees, isLoading, isError, refetch } = useEmployees();
  const markAttendance = useMarkAttendance();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const toggleAttendance = (employeeId: string) => {
    setAttendance(prev => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };

  const handleSaveAll = async () => {
    for (const [employeeId, isPresent] of Object.entries(attendance)) {
      await markAttendance.mutateAsync({
        employee_id: employeeId,
        work_date: selectedDate,
        is_present: isPresent,
      });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Chấm công"
        description="Bảng chấm công nhân viên"
        backPath="/hanh-chinh-nhan-su"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
            <button
              onClick={handleSaveAll}
              disabled={markAttendance.isPending || Object.keys(attendance).length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              Lưu chấm công
            </button>
          </div>
        }
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={3} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !employees?.length ? (
          <EmptyState title="Chưa có nhân viên" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Vai trò</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-32">Có mặt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.filter(e => ['staff', 'driver', 'manager'].includes(e.role)).map((e) => {
                  const isPresent = attendance[e.id] ?? false;
                  return (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-bold text-foreground">{e.full_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{e.role}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAttendance(e.id)}
                          className={clsx(
                            'w-10 h-10 rounded-xl flex items-center justify-center transition-all mx-auto',
                            isPresent ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500',
                          )}
                        >
                          {isPresent ? <Check size={20} /> : <X size={20} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
