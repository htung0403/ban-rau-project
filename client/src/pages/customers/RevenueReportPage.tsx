import React, { useMemo } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { TrendingUp, Banknote, PackageOpen } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const RevenueReportPage: React.FC = () => {
  const { data: exportOrders, isLoading, isError, refetch } = useExportOrders();

  const metrics = useMemo(() => {
    if (!exportOrders) return { totalRevenue: 0, totalDebt: 0, totalOrders: 0, collectedRevenue: 0 };
    return exportOrders.reduce((acc, order) => {
      acc.totalOrders++;
      acc.totalDebt += order.debt_amount || 0;
      acc.collectedRevenue += order.paid_amount || 0;
      acc.totalRevenue += (order.debt_amount || 0) + (order.paid_amount || 0);
      return acc;
    }, { totalRevenue: 0, totalDebt: 0, totalOrders: 0, collectedRevenue: 0 });
  }, [exportOrders]);

  const chartData = useMemo(() => {
    if (!exportOrders) return [];
    const grouped = exportOrders.reduce((acc: any, order) => {
      const date = new Date(order.export_date).toLocaleDateString('vi-VN');
      if (!acc[date]) acc[date] = { date, doanhThu: 0, congNo: 0 };
      acc[date].doanhThu += (order.debt_amount || 0) + (order.paid_amount || 0);
      acc[date].congNo += order.debt_amount || 0;
      return acc;
    }, {});
    return Object.values(grouped).slice(0, 7); // Last 7 days
  }, [exportOrders]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Báo cáo doanh thu"
        description="Tổng quan doanh thu từ các đơn hàng xuất"
        backPath="/ke-toan"
      />
      
      {isLoading ? (
        <LoadingSkeleton type="card" rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !exportOrders?.length ? (
        <EmptyState title="Chưa có dữ liệu xuất hàng" />
      ) : (
        <div className="flex flex-col gap-6 overflow-y-auto pb-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="text-primary" size={20} />
                </div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Tổng doanh thu</h3>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalRevenue)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Banknote className="text-emerald-500" size={20} />
                </div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Đã thu</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.collectedRevenue)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <TrendingUp className="text-red-500" size={20} />
                </div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Công nợ</h3>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalDebt)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <PackageOpen className="text-blue-500" size={20} />
                </div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Đơn xuất</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalOrders} đơn</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
             <h3 className="text-[15px] font-bold text-foreground mb-6">Biểu đồ doanh thu 7 ngày gần nhất</h3>
             <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}tr`} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} unit="đ" />
                    <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="doanhThu" name="Doanh thu" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="congNo" name="Công nợ" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueReportPage;
