import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useCustomers } from '../../hooks/queries/useCustomers';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Plus } from 'lucide-react';
import AddEditCustomerDialog from './dialogs/AddEditCustomerDialog';
import DraggableFAB from '../../components/shared/DraggableFAB';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const getCustomerTypeBadge = (type?: string) => {
  switch (type) {
    case 'wholesale': return { label: 'Vựa rau', color: 'bg-emerald-100/50 text-emerald-700 border-emerald-200' };
    case 'grocery': return { label: 'Tạp hóa', color: 'bg-blue-100/50 text-blue-700 border-blue-200' };
    case 'vegetable': return { label: 'KH Rau', color: 'bg-purple-100/50 text-purple-700 border-purple-200' };
    default: return { label: 'Chưa phân loại', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const WholesaleCustomersPage: React.FC = () => {
  const { data: customers, isLoading, isError, refetch } = useCustomers('wholesale');
  const navigate = useNavigate();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Danh sách Vựa"
          description="Quản lý danh sách vựa"
          backPath="/ke-toan"
          actions={
            <button
              onClick={() => setIsAddOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={16} />
              Thêm KH
            </button>
          }
        />
      </div>
      <div className="md:bg-white md:rounded-2xl md:border md:border-border md:shadow-sm flex flex-col flex-1 min-h-0 md:overflow-hidden -mx-4 sm:mx-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={5} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !customers?.length ? (
          <EmptyState title="Chưa có khách hàng" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Tên KH</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-42">Loại KH</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">SDT</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Địa chỉ</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Số đơn</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Doanh thu</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Công nợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => {
                        if (c.id) navigate(`/ke-toan/khach-hang/${c.id}`);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-[13px] font-bold text-foreground hover:underline decoration-primary/30">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const badge = getCustomerTypeBadge(c.customer_type);
                          return (
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-semibold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground truncate max-w-[150px]" title={c.address || ''}>
                        {c.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{c.total_orders}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(c.total_revenue)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(c.debt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-3 px-4 pb-24 pt-2">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col gap-3 bg-white rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => {
                    if (c.id) navigate(`/ke-toan/khach-hang/${c.id}`);
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[15px] font-bold text-foreground block truncate flex items-center gap-2">
                        {c.name}
                        {(() => {
                          const badge = getCustomerTypeBadge(c.customer_type);
                          return (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </span>
                      {c.address && <p className="text-[13px] text-muted-foreground truncate">{c.address}</p>}
                    </div>
                    {c.phone && (
                      <span className="text-[12px] px-2.5 py-1 bg-muted/10 rounded-md text-muted-foreground whitespace-nowrap shrink-0">{c.phone}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground">Số đơn</span>
                      <span className="text-[13px] font-bold text-foreground tabular-nums">{c.total_orders}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] text-muted-foreground">Doanh thu</span>
                      <span className="text-[13px] font-bold text-emerald-600 tabular-nums">{formatCurrency(c.total_revenue)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] text-muted-foreground">Công nợ</span>
                      <span className="text-[13px] font-bold text-red-600 tabular-nums">{formatCurrency(c.debt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DraggableFAB
        icon={<Plus size={24} />}
        onClick={() => setIsAddOpen(true)}
        className="bg-primary text-white w-14 h-14 rounded-full"
      />

      <AddEditCustomerDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
        defaultType='wholesale'
      />
    </div>
  );
};

export default WholesaleCustomersPage;
