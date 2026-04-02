import { useMemo } from 'react';
import { usePayrolls } from '../../hooks/queries/usePayroll';
import { useEmployees } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';

const PayrollStats = () => {
  const { data: payrolls, isLoading: loadingPay } = usePayrolls();
  const { data: employees, isLoading: loadingEmp } = useEmployees();

  const stats = useMemo(() => {
    if (!payrolls || !employees) return null;

    let totalGross = 0;
    let totalAdvances = 0;
    let totalNet = 0;
    let totalDaysWorked = 0;

    const employeeStats = new Map<string, { name: string, gross: number, net: number, advances: number, days: number }>();

    payrolls.forEach(p => {
      if (p.status === 'draft') return; // maybe only include confirmed and paid

      totalGross += p.gross_salary || 0;
      totalAdvances += p.total_advances || 0;
      totalNet += p.net_salary || 0;
      totalDaysWorked += p.days_worked || 0;

      const emp = employeeStats.get(p.employee_id) || {
        name: employees.find(e => e.id === p.employee_id)?.full_name || 'N/A',
        gross: 0,
        net: 0,
        advances: 0,
        days: 0,
      };

      emp.gross += p.gross_salary || 0;
      emp.net += p.net_salary || 0;
      emp.advances += p.total_advances || 0;
      emp.days += p.days_worked || 0;

      employeeStats.set(p.employee_id, emp);
    });

    return {
      totalGross,
      totalAdvances,
      totalNet,
      totalDaysWorked,
      employeeStats: Array.from(employeeStats.values()).sort((a, b) => b.net - a.net)
    };
  }, [payrolls, employees]);

  if (loadingPay || loadingEmp) {
    return <div className="p-4"><LoadingSkeleton rows={6} columns={4} /></div>;
  }

  if (!stats) return <EmptyState title="Không có dữ liệu thống kê" />;

  const formatCurr = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <div className="text-[12px] font-medium text-muted-foreground mb-1">Tổng lương gross (đã chốt)</div>
          <div className="text-xl font-bold text-emerald-700">{formatCurr(stats.totalGross)}</div>
        </div>
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
          <div className="text-[12px] font-medium text-muted-foreground mb-1">Tổng tạm ứng</div>
          <div className="text-xl font-bold text-red-600">{formatCurr(stats.totalAdvances)}</div>
        </div>
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
          <div className="text-[12px] font-medium text-muted-foreground mb-1">Tổng thực nhận</div>
          <div className="text-xl font-bold text-primary">{formatCurr(stats.totalNet)}</div>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl border border-border">
          <div className="text-[12px] font-medium text-muted-foreground mb-1">Tổng công</div>
          <div className="text-xl font-bold text-foreground">{stats.totalDaysWorked} ngày</div>
        </div>
      </div>

      <div className="bg-white border border-border overflow-hidden rounded-xl">
        <div className="p-4 border-b border-border bg-muted/10">
          <h3 className="font-bold text-[13px] text-primary flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary rounded-full"></div>
            Top nhân viên có thu nhập cao nhất
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase">Nhân viên</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase text-center">Tổng công</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase text-right">Tổng gross</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase text-right">Tạm ứng</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase text-right">Thực nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats.employeeStats.map((emp, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-[13px] font-semibold">{emp.name}</td>
                  <td className="px-4 py-3 text-[13px] text-center">{emp.days}</td>
                  <td className="px-4 py-3 text-[13px] text-right">{formatCurr(emp.gross)}</td>
                  <td className="px-4 py-3 text-[13px] text-right text-red-500">{emp.advances > 0 ? `-${formatCurr(emp.advances)}` : '0 đ'}</td>
                  <td className="px-4 py-3 text-[13px] text-right font-bold text-emerald-600">{formatCurr(emp.net)}</td>
                </tr>
              ))}
              {stats.employeeStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollStats;
