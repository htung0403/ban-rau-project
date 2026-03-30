import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useCustomers } from '../../hooks/queries/useCustomers';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Plus } from 'lucide-react';
import AddEditCustomerDialog from './dialogs/AddEditCustomerDialog';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const CustomersPage: React.FC = () => {
  const { data: customers, isLoading, isError, refetch } = useCustomers();
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
      <PageHeader
        title="Danh sách khách hàng"
        description="Quản lý thông tin khách hàng"
        backPath="/ke-toan"
        actions={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Thêm KH
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={5} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !customers?.length ? (
          <EmptyState title="Chưa có khách hàng" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Tên KH</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">SDT</th>
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
                      if (c.id) navigate(`${c.id}`);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-[13px] font-bold text-foreground hover:underline decoration-primary/30">
                          {c.name}
                        </span>
                        {c.address && <p className="text-[11px] text-muted-foreground truncate max-w-xs">{c.address}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{c.total_orders}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(c.total_revenue)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(c.debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddEditCustomerDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
      />
    </div>
  );
};

export default CustomersPage;
