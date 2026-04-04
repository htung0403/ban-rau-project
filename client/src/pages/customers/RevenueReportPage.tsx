import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import {
  TrendingUp, Banknote, PackageOpen, FileText, ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { ExportOrder } from '../../types';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const getSafeName = (obj: any, fallback: string = 'N/A') => {
  if (!obj) return fallback;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj[0]?.name || fallback;
  return obj.name || fallback;
};

const statusLabels: Record<string, string> = {
  paid: 'Đã thanh toán',
  partial: 'T.Toán một phần',
  unpaid: 'Chưa thanh toán',
  pending: 'Đang xử lý',
  processing: 'Đang xử lý',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  partial: 'bg-amber-50 text-amber-600 border-amber-100',
  unpaid: 'bg-red-50 text-red-600 border-red-100',
  pending: 'bg-slate-50 text-slate-600 border-slate-100',
  processing: 'bg-blue-50 text-blue-600 border-blue-100',
  delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const RevenueReportPage: React.FC = () => {
  const { data: exportOrders, isLoading: isExportLoading, isError: isExportError, refetch: refetchExport } = useExportOrders();
  const { data: importOrders, isLoading: isImportLoading, isError: isImportError, refetch: refetchImport } = useImportOrders();

  const isLoading = isExportLoading || isImportLoading;
  const isError = isExportError || isImportError;
  const refetch = () => { refetchExport(); refetchImport(); };

  const metrics = useMemo(() => {
    if (!exportOrders) return { totalRevenue: 0, totalDebt: 0, totalOrders: 0, collectedRevenue: 0 };
    return exportOrders.reduce((acc: any, order: ExportOrder) => {
      acc.totalOrders++;
      acc.totalDebt += order.debt_amount || 0;
      acc.collectedRevenue += order.paid_amount || 0;
      acc.totalRevenue += (order.debt_amount || 0) + (order.paid_amount || 0);
      return acc;
    }, { totalRevenue: 0, totalDebt: 0, totalOrders: 0, collectedRevenue: 0 });
  }, [exportOrders]);

  const chartData = useMemo(() => {
    if (!exportOrders) return [];
    const grouped = exportOrders.reduce((acc: any, order: ExportOrder) => {
      const date = new Date(order.export_date).toLocaleDateString('vi-VN');
      if (!acc[date]) acc[date] = { date, doanhThu: 0, congNo: 0 };
      acc[date].doanhThu += (order.debt_amount || 0) + (order.paid_amount || 0);
      acc[date].congNo += order.debt_amount || 0;
      return acc;
    }, {});
    return Object.values(grouped).slice(0, 7); // Last 7 days
  }, [exportOrders]);

  const exportActivities = useMemo(() => {
    if (!exportOrders || !Array.isArray(exportOrders)) return [];
    return exportOrders.map((o: ExportOrder) => ({
      id: `export-${o.id}`,
      date: String(o.export_date || ''),
      type: 'export',
      entity: getSafeName(o.customers, 'Khách lẻ'),
      product: getSafeName(o.products),
      quantity: Number(o.quantity || 0),
      totalAmount: Number((o.debt_amount || 0) + (o.paid_amount || 0)),
      status: String(o.payment_status || 'unpaid')
    })).sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    }).slice(0, 10);
  }, [exportOrders]);

  const importActivities = useMemo(() => {
    if (!importOrders || !Array.isArray(importOrders)) return [];
    return importOrders.map((o: any) => {
      const firstProduct = o.import_order_items?.[0]?.products || o.products;
      return {
        id: `import-${o.id}`,
        date: String(o.order_date || ''),
        type: 'import',
        entity: getSafeName(o.customers, o.sender_name || 'N/A'),
        product: getSafeName(firstProduct),
        quantity: Number(o.quantity || 0),
        totalAmount: Number(o.total_amount || 0),
        status: String(o.status || 'pending')
      };
    }).sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    }).slice(0, 10);
  }, [importOrders]);

  const ActivityTable = ({ title, icon: Icon, activities, accentColor, viewPath }: { title: string, icon: any, activities: any[], accentColor: string, viewPath: string }) => (
    <div className="bg-transparent md:bg-white md:rounded-2xl md:border md:border-border md:shadow-sm md:overflow-hidden flex-1">
      <div className="px-4 py-3 md:p-4 border-b border-border/50 md:border-border flex items-center justify-between bg-white md:bg-slate-50/50 sticky md:static -top-4 z-20 md:z-auto shadow-sm md:shadow-none">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-slate-50 md:bg-transparent ${accentColor}`}>
            <Icon size={18} className="md:w-4 md:h-4" />
          </div>
          <h3 className="text-[15px] md:text-[14px] font-bold text-foreground">{title}</h3>
          <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 bg-white border border-border rounded-full shadow-sm text-muted-foreground uppercase ml-1">
            {activities.length}
          </span>
        </div>
        <Link
          to={viewPath}
          className="text-[12px] font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-full transition-all flex items-center gap-1"
          title="Xem tất cả"
        >
          Xem tất cả
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground italic text-xs bg-white md:bg-transparent">
          Chưa có ghi nhận.
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col px-4 py-4 gap-3">
            {activities.map((act) => (
              <div key={`mob-${act.id}`} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-bold text-foreground line-clamp-1">{act.entity}</span>
                    <span className="text-[12px] text-muted-foreground mt-0.5">{act.date}</span>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border whitespace-nowrap ${statusColors[act.status.toLowerCase()] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {statusLabels[act.status.toLowerCase()] || act.status}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Sản phẩm</span>
                    <span className="text-[12px] font-bold text-slate-700 line-clamp-1">{act.product}</span>
                  </div>
                  <div className="flex flex-col items-end border-l border-slate-200/50 pl-2">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Số lượng</span>
                    <span className="text-[12px] font-black text-slate-700">{act.quantity}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tổng trị giá</span>
                  <span className={`text-[16px] font-black tabular-nums leading-none ${act.type === 'export' ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(act.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block divide-y divide-border">
            <div className="grid grid-cols-6 gap-4 px-5 py-2.5 bg-slate-50/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden lg:grid">
              <div className="col-span-1">Ngày</div>
              <div className="col-span-1">Đối tác</div>
              <div className="col-span-1">Sản phẩm</div>
              <div className="col-span-1 text-center">SL</div>
              <div className="col-span-1 text-right">Giá trị</div>
              <div className="col-span-1 text-center">Trạng thái</div>
            </div>
            {activities.map((act) => (
              <div key={`desktop-${act.id}`} className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-4 px-5 py-3 hover:bg-slate-50 transition-colors items-center">
                <div className="flex items-center gap-2 lg:col-span-1">
                  <span className="text-[12px] text-muted-foreground tabular-nums font-medium">{act.date || '---'}</span>
                </div>
                <div className="flex items-center gap-2 lg:col-span-1">
                  <span className="text-[12px] font-semibold truncate text-foreground">{act.entity}</span>
                </div>
                <div className="flex items-center gap-2 lg:col-span-1 text-slate-500">
                  <span className="text-[12px] truncate">{act.product}</span>
                </div>
                <div className="flex lg:block justify-between items-center lg:col-span-1 lg:text-center text-[12px] font-bold">
                  <span className="text-foreground">{act.quantity}</span>
                </div>
                <div className="flex lg:block justify-between items-center lg:col-span-1 lg:text-right text-[12px] font-bold">
                  <span className={act.type === 'export' ? 'text-blue-600' : 'text-orange-600'}>{formatCurrency(act.totalAmount)}</span>
                </div>
                <div className="flex lg:block justify-between items-center lg:col-span-1 lg:text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border whitespace-nowrap ${statusColors[act.status.toLowerCase()] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {statusLabels[act.status.toLowerCase()] || act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-20">
      <div className="hidden md:block">
        <PageHeader
          title="Báo cáo doanh thu"
          description="Tổng quan hoạt động kinh doanh"
          backPath="/ke-toan"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col space-y-6 pt-2 sm:pt-0 -mx-4 sm:mx-0">
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 px-4 sm:px-0">
            <div className="bg-white p-4 lg:p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2 lg:mb-3 text-primary">
                <div className="w-8 h-8 lg:w-auto lg:h-auto rounded-lg bg-primary/10 lg:bg-transparent flex items-center justify-center">
                  <TrendingUp size={16} className="lg:w-5 lg:h-5" />
                </div>
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-muted-foreground">Doanh thu</span>
              </div>
              <p
                className="text-[14px] sm:text-[16px] md:text-xl lg:text-2xl font-black tabular-nums tracking-tighter truncate"
                title={formatCurrency(metrics.totalRevenue)}
              >
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
            <div className="bg-white p-4 lg:p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2 lg:mb-3 text-emerald-500">
                <div className="w-8 h-8 lg:w-auto lg:h-auto rounded-lg bg-emerald-500/10 lg:bg-transparent flex items-center justify-center">
                  <Banknote size={16} className="lg:w-5 lg:h-5" />
                </div>
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-muted-foreground">Đã thu</span>
              </div>
              <p
                className="text-[14px] sm:text-[16px] md:text-xl lg:text-2xl font-black text-emerald-600 tabular-nums tracking-tighter truncate"
                title={formatCurrency(metrics.collectedRevenue)}
              >
                {formatCurrency(metrics.collectedRevenue)}
              </p>
            </div>
            <div className="bg-white p-4 lg:p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2 lg:mb-3 text-red-500">
                <div className="w-8 h-8 lg:w-auto lg:h-auto rounded-lg bg-red-500/10 lg:bg-transparent flex items-center justify-center">
                  <TrendingUp size={16} className="lg:w-5 lg:h-5" />
                </div>
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-muted-foreground">Công nợ</span>
              </div>
              <p
                className="text-[14px] sm:text-[16px] md:text-xl lg:text-2xl font-black text-red-600 tabular-nums tracking-tighter truncate"
                title={formatCurrency(metrics.totalDebt)}
              >
                {formatCurrency(metrics.totalDebt)}
              </p>
            </div>
            <div className="bg-white p-4 lg:p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2 lg:mb-3 text-blue-500">
                <div className="w-8 h-8 lg:w-auto lg:h-auto rounded-lg bg-blue-500/10 lg:bg-transparent flex items-center justify-center">
                  <PackageOpen size={16} className="lg:w-5 lg:h-5" />
                </div>
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-muted-foreground">Đơn hàng</span>
              </div>
              <p className="text-[14px] sm:text-[16px] md:text-xl lg:text-2xl font-black tabular-nums tracking-tighter truncate">
                {metrics.totalOrders} <span className="text-[10px] font-bold text-muted-foreground lg:hidden tracking-normal">ĐƠN</span>
              </p>
            </div>
          </div>

          {/* Chart Panel */}
          <div className="bg-white sm:rounded-2xl border-y sm:border border-border shadow-sm p-4 lg:p-6">
            <h3 className="text-[14px] lg:text-[15px] font-bold text-foreground mb-4 lg:mb-6">Biểu đồ doanh thu 7 ngày gần nhất</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${val / 1000000}tr`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="đ" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="doanhThu" name="Doanh thu" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="congNo" name="Công nợ" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ActivityTable
              title="Phiếu xuất gần đây"
              icon={FileText}
              activities={exportActivities}
              accentColor="text-blue-500"
              viewPath="/hang-hoa/xuat-hang"
            />
            <ActivityTable
              title="Phiếu nhập gần đây"
              icon={FileText}
              activities={importActivities}
              accentColor="text-orange-500"
              viewPath="/hang-hoa/nhap-hang"
            />
          </div>
        </div>
      )
      }
    </div>
  );
};

export default RevenueReportPage;
