import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { usePayrolls, useGeneratePayroll, useConfirmPayroll, useUpdatePayrollStatuses } from '../../hooks/queries/usePayroll';
import { useEmployees, useAttendance } from '../../hooks/queries/useHR';
import { useRoleSalaries } from '../../hooks/queries/usePriceSettings';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Lock, ChevronRight, User as UserIcon, Check, FileText, BarChart2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { clsx } from 'clsx';
import PayrollStats from './PayrollStats';

import type { Attendance } from '../../types';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  confirmed: 'Đã chốt',
  paid: 'Đã trả lương',
};

const translateRole = (role: string) => {
  const map: Record<string, string> = { admin: 'Quản trị viên', manager: 'Quản lý', staff: 'Nhân viên', driver: 'Tài xế' };
  return map[role] || role;
};

const PayrollPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'payroll' | 'stats'>('payroll');

  const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: employees, isLoading: loadingEmployees, isError: errEmp, refetch: refetchEmployees } = useEmployees();
  const { data: roles } = useRoleSalaries();

  const { data: attendanceData, isLoading: loadingAtt, isError: errAtt, refetch: refetchAtt } = useAttendance(
    selectedDate,
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  const { data: allPayrolls, isLoading: loadingPay, isError: errPay, refetch: refetchPay } = usePayrolls();
  const generateMutation = useGeneratePayroll();
  const confirmMutation = useConfirmPayroll();
  const updateStatusesMutation = useUpdatePayrollStatuses();

  const [localAttendance, setLocalAttendance] = useState<Record<string, Record<string, Partial<Attendance>>>>({});
  const [pendingPaidChanges, setPendingPaidChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (attendanceData) {
      const mapping: Record<string, Record<string, Partial<Attendance>>> = {};
      attendanceData.forEach(item => {
        if (!mapping[item.employee_id]) mapping[item.employee_id] = {};
        mapping[item.employee_id][item.work_date] = item;
      });
      setLocalAttendance(mapping);
    }
  }, [attendanceData]);

  const handleGenerate = () => {
    generateMutation.mutate(weekStartStr);
  };

  const handleTogglePaid = (id: string, currentlyPaid: boolean) => {
    setPendingPaidChanges(prev => {
      const next = { ...prev };
      const newValue = !currentlyPaid;

      // If we are reverting to original DB state, we can delete the key
      const dbRecord = currentWeekPayrolls.find(p => p.id === id);
      if (dbRecord && (dbRecord.status === 'paid') === newValue) {
        delete next[id];
      } else {
        next[id] = newValue;
      }
      return next;
    });
  };

  const handleSaveChanges = () => {
    const updates = Object.entries(pendingPaidChanges).map(([id, isPaid]) => ({
      id,
      status: isPaid ? 'paid' : 'confirmed',
    }));
    updateStatusesMutation.mutate(updates, {
      onSuccess: () => setPendingPaidChanges({})
    });
  };

  const hasPendingChanges = Object.keys(pendingPaidChanges).length > 0;
  const isLoading = loadingEmployees || loadingAtt || loadingPay;
  const isError = errEmp || errAtt || errPay;

  const currentWeekPayrolls = allPayrolls?.filter(p => p.week_start === weekStartStr) || [];

  // Active employees
  const targetEmployees = employees?.filter(e => e.is_active && ['admin', 'manager', 'staff', 'driver'].includes(e.role)) || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Bảng lương"
        description="Tính lương và chốt lương nhân viên theo tuần"
        backPath="/hanh-chinh-nhan-su"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-border/80 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => { setSelectedDate(format(subDays(new Date(selectedDate), 7), 'yyyy-MM-dd')); setPendingPaidChanges({}); }}
                className="p-2 hover:bg-muted text-muted-foreground transition-colors border-r border-border/50"
              >
                <ChevronRight className="rotate-180" size={16} />
              </button>
              <div className="px-4 py-2 text-[13px] font-bold text-foreground">
                Tuần {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM')}
              </div>
              <button
                onClick={() => { setSelectedDate(format(addDays(new Date(selectedDate), 7), 'yyyy-MM-dd')); setPendingPaidChanges({}); }}
                className="p-2 hover:bg-muted text-muted-foreground transition-colors border-l border-border/50"
              >
                <ChevronRight size={16} />
              </button>
            </div>


            {hasPendingChanges ? (
              <button
                onClick={handleSaveChanges}
                disabled={updateStatusesMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-[13px] font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
              >
                <Check size={16} />
                {updateStatusesMutation.isPending ? 'Đang lưu...' : 'Lưu trạng thái trả lương'}
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
              >
                <Lock size={16} />
                {generateMutation.isPending ? 'Đang xử lý...' : 'Khoá sổ / Chốt lương tuần'}
              </button>
            )}
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden mt-2">
        <div className="flex border-b border-border bg-muted/20">
          <button
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-2 px-6 py-4 text-[13px] font-bold transition-all relative",
              activeTab === 'payroll' 
                ? "text-primary bg-primary/5" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <FileText size={16} />
            Bảng lương
            {activeTab === 'payroll' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--primary),0.5)]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={clsx(
              "flex items-center gap-2 px-6 py-4 text-[13px] font-bold transition-all relative",
              activeTab === 'stats' 
                ? "text-primary bg-primary/5" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <BarChart2 size={16} />
            Thống kê
            {activeTab === 'stats' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--primary),0.5)]"></div>
            )}
          </button>
        </div>

        {activeTab === 'stats' ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <PayrollStats />
          </div>
        ) : isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={8} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => { refetchEmployees(); refetchAtt(); refetchPay(); }} />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-[#f8fafc] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <tr>
                  <th className="sticky text-center left-0 z-30 bg-[#f8fafc] px-3 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider whitespace-nowrap min-w-[200px] border-b border-r border-border/50">
                    Nhân sự
                  </th>
                  {daysInWeek.map((day) => (
                    <th key={day.toISOString()} className="px-2 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center border-b border-border/50 min-w-[60px]">
                      {format(day, 'EEEE', { locale: vi }).replace('thứ', 'T')}
                      <div className="text-[10px] text-muted-foreground/50 mt-0.5">{format(day, 'dd/MM')}</div>
                    </th>
                  ))}
                  <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center border-b border-l border-border/50 bg-muted/10">Ngày công</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-right border-b border-l border-border/50">Lương/ngày</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-emerald-600 uppercase tracking-wider text-right border-b border-border/50 bg-emerald-50/30">Tổng lương</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-red-500 uppercase tracking-wider text-right border-b border-border/50 bg-red-50/30">Tạm ứng</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-emerald-700 uppercase tracking-wider text-right border-b border-border/50 bg-emerald-50/50">Thực nhận</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center border-b border-l border-border/50">Trạng thái</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center border-b border-l border-border/50">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {targetEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-8">
                      <EmptyState title="Chưa có nhân sự nào được cấu hình" />
                    </td>
                  </tr>
                ) : (
                  targetEmployees.map(e => {
                    const empAtt = localAttendance[e.id] || {};
                    let totalPresent = 0;

                    // Calculate real-time presence
                    daysInWeek.forEach(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      if (empAtt[dateStr]?.is_present) totalPresent++;
                    });

                    const employeePayroll = currentWeekPayrolls.find(p => p.employee_id === e.id);

                    // Display dynamic info if payroll not generated, else show saved data
                    const dailyWage = employeePayroll?.daily_wage || roles?.find(r => r.role_key === e.role)?.daily_wage || 0;
                    const daysWorked = employeePayroll?.days_worked ?? totalPresent;
                    const grossSalary = employeePayroll?.gross_salary ?? (daysWorked * dailyWage);
                    const totalAdvances = employeePayroll?.total_advances ?? 0;
                    const netSalary = employeePayroll?.net_salary ?? (grossSalary - totalAdvances);
                    const status = employeePayroll?.status || 'Chưa tạo';

                    const isPaidState = employeePayroll ? (pendingPaidChanges[employeePayroll.id] !== undefined ? pendingPaidChanges[employeePayroll.id] : status === 'paid') : false;

                    return (
                      <tr key={e.id} className="group hover:bg-muted/10 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-muted/10 px-4 py-3 border-r border-border/10 transition-colors">
                          <div className="flex items-center gap-3">
                            {e.avatar_url ? (
                              <img src={e.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-muted/30 border border-border/50 shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                <UserIcon size={14} />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-foreground">{e.full_name}</span>
                              <span className="text-[10px] font-medium text-muted-foreground">{roles?.find(r => r.role_key === e.role)?.role_name || translateRole(e.role)}</span>
                            </div>
                          </div>
                        </td>

                        {daysInWeek.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isPresent = empAtt[dateStr]?.is_present;
                          return (
                            <td key={dateStr} className="px-2 py-4 text-center border-l border-border/10 h-full">
                              <div className="flex items-center justify-center h-full">
                                {isPresent ? (
                                  <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
                                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-border/80"></div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 text-center border-l border-border/10 bg-muted/5 font-bold text-[13px] text-primary tabular-nums">
                          {daysWorked}
                        </td>
                        <td className="px-4 py-3 text-right border-l border-border/10 text-[12px] text-muted-foreground tabular-nums">
                          {formatCurrency(dailyWage)}
                        </td>
                        <td className="px-4 py-3 text-right border-border/10 font-bold text-[13px] text-emerald-600 tabular-nums bg-emerald-50/20">
                          {formatCurrency(grossSalary)}
                        </td>
                        <td className="px-4 py-3 text-right border-border/10 font-bold text-[13px] text-red-500 tabular-nums bg-red-50/20">
                          {totalAdvances > 0 ? `-${formatCurrency(totalAdvances)}` : '0 đ'}
                        </td>
                        <td className="px-4 py-3 text-right border-border/10 font-bold text-[14px] text-emerald-700 tabular-nums bg-emerald-50/40">
                          {formatCurrency(netSalary)}
                        </td>
                        <td className="px-4 py-3 text-center border-l border-border/10">
                          {employeePayroll ? (
                            <StatusBadge status={isPaidState ? 'paid' : status} label={statusLabels[isPaidState ? 'paid' : status]} />
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-bold">Chưa tạo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-l border-border/10">
                          <div className="flex items-center justify-center gap-2">
                            {employeePayroll && (status === 'confirmed' || status === 'paid') && (
                              <label className="flex items-center gap-1.5 cursor-pointer title-tooltip" title="Xác nhận đã trả lương">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-emerald-500 rounded border-border/50 focus:ring-emerald-500/20"
                                  checked={isPaidState}
                                  onChange={() => handleTogglePaid(employeePayroll.id, isPaidState)}
                                />
                                <span className="text-[11px] font-medium text-muted-foreground">Đã trả</span>
                              </label>
                            )}
                            {status === 'draft' && employeePayroll && (
                              <button
                                onClick={() => confirmMutation.mutate(employeePayroll.id)}
                                disabled={confirmMutation.isPending}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors bg-blue-50/50"
                                title="Chốt lương"
                              >
                                <Lock size={14} />
                              </button>
                            )}
                            {/* {employeePayroll && (
                                <button
                                  onClick={() => window.print()}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  title="In phiếu lương"
                                >
                                  <Printer size={14} />
                                </button>
                              )} */}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeTab === 'payroll' && (
        <div className="mt-4 bg-muted/30 border border-border rounded-2xl p-4 flex items-center gap-6 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
              <Check size={10} className="text-emerald-600" strokeWidth={3} />
            </div>
            <span className="text-[12px] font-bold text-muted-foreground">Đi làm</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-border/80"></div>
            </div>
            <span className="text-[12px] font-bold text-muted-foreground">Không làm</span>
          </div>
          <div className="flex-1 text-right text-[12px] font-medium text-muted-foreground">
            Bấm <span className="font-bold">Khoá sổ / Chốt lương tuần</span> để lưu và chốt dữ liệu từ bảng chấm công vào cơ sở dữ liệu.
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
