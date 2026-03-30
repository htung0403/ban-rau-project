import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useCustomer, useCustomerOrders, useCustomerExportOrders, useCustomerReceipts } from '../../hooks/queries/useCustomers';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { Phone, MapPin, Building2, PackageCheck, FileSpreadsheet, Receipt, Clock, Wallet } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import CollectDebtDialog from './dialogs/CollectDebtDialog';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import type { ImportOrder, ExportOrder, Receipt as ReceiptType } from '../../types';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
};

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: Building2 },
  { id: 'imports', label: 'Phiếu nhập', icon: PackageCheck },
  { id: 'exports', label: 'Phiếu xuất', icon: FileSpreadsheet },
  { id: 'receipts', label: 'Lịch sử thu nợ', icon: Receipt },
] as const;

type TabId = typeof TABS[number]['id'];

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isCollectDebtOpen, setIsCollectDebtOpen] = useState(false);
  const [isCollectDebtClosing, setIsCollectDebtClosing] = useState(false);

  const { data: customer, isLoading: isLoadingCustomer, isError: isErrorCustomer } = useCustomer(id!);
  const { data: importOrders, isLoading: isLoadingImports } = useCustomerOrders(id!);
  const { data: exportOrders, isLoading: isLoadingExports } = useCustomerExportOrders(id!);
  const { data: receipts, isLoading: isLoadingReceipts } = useCustomerReceipts(id!);
  const { setDynamicLabel } = useBreadcrumbs();
  const location = useLocation();

  // Update breadcrumb label when customer data is available
  React.useEffect(() => {
    if (customer?.name) {
      setDynamicLabel(location.pathname, customer.name);
    }
  }, [customer?.name, location.pathname, setDynamicLabel]);

  const closeCollectDebtDialog = () => {
    setIsCollectDebtClosing(true);
    setTimeout(() => {
      setIsCollectDebtOpen(false);
      setIsCollectDebtClosing(false);
    }, 350);
  };

  if (isLoadingCustomer) return <div className="p-6"><LoadingSkeleton rows={5} /></div>;
  if (isErrorCustomer || !customer) return <ErrorState onRetry={() => navigate('/ke-toan/khach-hang')} />;

  return (
    <div className="animate-in fade-in flex-1 flex flex-col min-h-0 relative z-0">
      <PageHeader
        title={`Chi tiết: ${customer.name}`}
        description="Theo dõi lịch sử giao dịch và công nợ"
        backPath="/ke-toan/khach-hang"
        actions={
          <button
            onClick={() => setIsCollectDebtOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all font-inter"
          >
            <Wallet size={16} />
            Thu Nợ
          </button>
        }
      />

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-4 overflow-x-auto p-1 custom-scrollbar shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all shrink-0 whitespace-nowrap",
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-white text-muted-foreground hover:bg-muted/50 border border-border"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-6 overflow-y-auto w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-muted/5 border border-border rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                  Thông tin liên hệ
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[14px] font-medium text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <span>{customer.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] font-medium text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Phone size={16} />
                    </div>
                    <span>{customer.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] font-medium text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <span>{customer.address || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] font-medium text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <span>Tham gia: {formatDate(customer.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-emerald-600 flex items-center justify-center shrink-0">
                    <Receipt size={24} />
                  </div>
                  <div>
                     <p className="text-[12px] font-bold text-emerald-800/60 uppercase tracking-widest mb-1">Dư nợ hiện tại</p>
                     <p className="text-2xl font-black text-emerald-700 tabular-nums">{formatCurrency(customer.debt)}</p>
                  </div>
               </div>

               <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-blue-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                     <p className="text-[12px] font-bold text-blue-800/60 uppercase tracking-widest mb-1">Tổng doanh thu mua hàng</p>
                     <p className="text-2xl font-black text-blue-700 tabular-nums">{formatCurrency(customer.total_revenue)}</p>
                  </div>
               </div>

               <div className="bg-muted/10 border border-border rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-border text-foreground flex items-center justify-center shrink-0">
                    <PackageCheck size={24} />
                  </div>
                  <div>
                     <p className="text-[12px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">Tổng số đơn nhập gửi</p>
                     <p className="text-2xl font-black text-foreground tabular-nums">{customer.total_orders}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TAB: IMPORTS */}
        {activeTab === 'imports' && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {isLoadingImports ? <div className="p-4"><LoadingSkeleton rows={5} columns={6}/></div> : !importOrders?.length ? <EmptyState title="Không có phiếu nhập" /> : (
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Mã đơn</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ngày</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Người nhận</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">SL</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Thành tiền</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {importOrders.map((o: ImportOrder) => (
                    <tr key={o.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-[13px] font-bold text-foreground">{o.order_code}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{formatDate(o.order_date)}</td>
                      <td className="px-4 py-3 text-[13px] text-foreground">{o.receiver_name}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-right tabular-nums">{o.quantity} {o.package_type}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(o.total_amount)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: EXPORTS */}
        {activeTab === 'exports' && (
          <div className="flex-1 overflow-auto custom-scrollbar">
             {isLoadingExports ? <div className="p-4"><LoadingSkeleton rows={5} columns={6}/></div> : !exportOrders?.length ? <EmptyState title="Không có phiếu xuất" /> : (
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ngày xuất</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Mặt hàng</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">SL</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Giá trị (Nợ)</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Đã thanh toán</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {exportOrders.map((o: ExportOrder) => (
                    <tr key={o.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{formatDate(o.export_date)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-foreground">
                        {o.products?.name || (o as any).item_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold text-right tabular-nums">{o.quantity}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(o.debt_amount)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(o.paid_amount)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={o.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: RECEIPTS */}
        {activeTab === 'receipts' && (
          <div className="flex-1 overflow-auto custom-scrollbar">
             {isLoadingReceipts ? <div className="p-4"><LoadingSkeleton rows={5} columns={5}/></div> : !receipts?.length ? <EmptyState title="Không có lịch sử thu tiền" /> : (
              <table className="w-full border-collapse min-w-[700px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-32">Ngày thu</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-40">Số tiền thu</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ghi chú</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-48">Người thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {receipts.map((r: ReceiptType) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-[13px] font-bold text-foreground tabular-nums">{formatDate(r.payment_date)}</td>
                      <td className="px-4 py-3 text-[14px] font-black text-emerald-600 text-right tabular-nums">+{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.notes || '-'}</td>
                      <td className="px-4 py-3 text-[12px] text-center text-muted-foreground">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/30 border border-border">
                          {r.profiles?.full_name || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <CollectDebtDialog
         isOpen={isCollectDebtOpen}
         isClosing={isCollectDebtClosing}
         onClose={closeCollectDebtDialog}
         customer={customer}
      />
    </div>
  );
};

export default CustomerDetailPage;
