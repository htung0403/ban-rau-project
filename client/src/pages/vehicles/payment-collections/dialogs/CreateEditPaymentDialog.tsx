import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ChevronRight, Tag, Save, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../../context/AuthContext';
import { useAllPendingDeliveries } from '../../../../hooks/queries/useDelivery';
import type { PaymentCollection } from '../../../../types';
import { useCreatePaymentCollection, useUpdatePaymentCollection } from '../../../../hooks/queries/usePaymentCollections';
import { formatCurrency } from '../../../../utils/formatters';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payment?: PaymentCollection | null;
}

const CreateEditPaymentDialog: React.FC<Props> = ({ isOpen, onClose, payment }) => {
  const { mutate: createPayment, isPending: isCreating } = useCreatePaymentCollection();
  const { mutate: updatePayment, isPending: isUpdating } = useUpdatePaymentCollection();

  const isEdit = !!payment;
  
  const { user } = useAuth();
  const { data: deliveries } = useAllPendingDeliveries();

  // Resolve pending orders for the logged-in driver based on deliveries
  const pendingOrders = useMemo(() => {
    if (!deliveries) return [];
    return deliveries
      .filter(d => 
        d.status !== 'da_giao' && 
        d.delivery_vehicles?.some(v => v.driver_id === user?.id)
      )
      .map(d => {
        const myAssignment = d.delivery_vehicles?.find(v => v.driver_id === user?.id);
        return {
          id: d.id,
          code: d.import_orders?.order_code || 'N/A',
          customer: d.import_orders?.customers?.name || 'Vô Danh',
          productName: d.product_name,
          quantity: myAssignment?.assigned_quantity || d.total_quantity,
          amount: myAssignment?.expected_amount || d.import_orders?.total_amount || 0
        };
      });
  }, [deliveries, user?.id]);

  const [deliveryOrderId, setDeliveryOrderId] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [collectedAt, setCollectedAt] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (payment) {
      setDeliveryOrderId(payment.deliveryOrderId);
      setCollectedAmount(payment.collectedAmount.toString());
      setCollectedAt(payment.collectedAt ? payment.collectedAt.substring(0,16) : new Date().toISOString().substring(0,16));
      setNotes(payment.notes || '');
    } else {
      setDeliveryOrderId('');
      setCollectedAmount('');
      setCollectedAt(new Date().toISOString().substring(0,16));
      setNotes('');
    }
  }, [payment, isOpen]);

  if (!isOpen) return null;

  // Selected order details
  const selectedOrder = pendingOrders.find(o => o.id === deliveryOrderId);
  const expectedAmount = payment ? payment.expectedAmount : (selectedOrder?.amount || 0);
  const currentDiff = Number(collectedAmount || 0) - expectedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryOrderId) return alert('Vui lòng chọn đơn hàng');
    if (Number(collectedAmount) < 0) return alert('Số tiền không hợp lệ');

    if (isEdit) {
      updatePayment({
        id: payment.id,
        data: {
          collectedAmount: Number(collectedAmount),
          collectedAt: new Date(collectedAt).toISOString(),
          notes
        }
      }, {
        onSuccess: onClose
      });
    } else {
      createPayment({
        deliveryOrderId,
        collectedAmount: Number(collectedAmount),
        collectedAt: new Date(collectedAt).toISOString(),
        notes
      }, {
        onSuccess: onClose
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[650px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-slate-200 dialog-slide-in">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? 'Sửa Phiếu Thu Tiền' : 'Tạo Phiếu Thu Tiền'}
            </h2>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form id="create-edit-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Chi tiết khoản thu</span>
            </div>
            
            <div className="p-5 space-y-4">
              {!isEdit && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground">Đơn Hàng <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={pendingOrders.map(o => ({
                      value: o.id,
                      label: `${o.code} — ${o.customer} — ${o.productName} (SL: ${o.quantity}) — ${formatCurrency(o.amount)}`
                    }))}
                    value={deliveryOrderId}
                    onValueChange={(val) => {
                      setDeliveryOrderId(val);
                      // Yêu cầu: Để tài xế tự điền số tiền thay vì tự động điền
                      setCollectedAmount('');
                    }}
                    placeholder="-- Chọn đơn hàng --"
                    searchPlaceholder="Tìm mã hoặc tên KH..."
                    emptyMessage="Không có đơn hàng nào."
                  />
                </div>
              )}

              {isEdit && payment && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                  <p className="text-[13px] text-slate-600">Đơn Hàng: <span className="font-bold text-slate-800">{payment.deliveryOrderCode}</span></p>
                  <p className="text-[13px] text-slate-600">Khách Hàng: <span className="font-bold text-slate-800">{payment.customerName}</span></p>
                  <p className="text-[13px] text-slate-600">Tiền Theo Đơn: <span className="font-bold text-slate-800">{formatCurrency(payment.expectedAmount)}</span></p>
                </div>
              )}

              {!isEdit && selectedOrder && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                  <p className="text-[13px] text-slate-600">Khách Hàng: <span className="font-bold text-slate-800">{selectedOrder.customer}</span></p>
                  <p className="text-[13px] text-slate-600">Tiền Theo Đơn: <span className="font-bold text-slate-800">{formatCurrency(selectedOrder.amount)}</span></p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Tiền Thu Thực Tế (VNĐ) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={collectedAmount ? new Intl.NumberFormat('vi-VN').format(Number(collectedAmount)) : ''} 
                  onChange={e => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setCollectedAmount(rawValue);
                  }}
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  required 
                />
                {deliveryOrderId && (
                  <p className={`text-[12px] mt-1.5 font-bold ${currentDiff < 0 ? 'text-red-500' : currentDiff > 0 ? 'text-green-500' : 'text-slate-500'}`}>
                    Chênh lệch: {currentDiff < 0 ? `Thiếu ${formatCurrency(Math.abs(currentDiff))}` : currentDiff > 0 ? `Thừa ${formatCurrency(currentDiff)}` : 'Vừa đủ'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Thu Lúc <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  value={collectedAt} 
                  onChange={e => setCollectedAt(e.target.value)} 
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">
                  Ghi Chú {currentDiff < 0 && <span className="text-red-500 font-bold ml-1">(Bắt buộc khi thu thiếu)</span>}
                </label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3}
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium"
                  placeholder="VD: Khách trả thiếu, hẹn mai trả phần còn lại"
                  required={currentDiff < 0}
                />
              </div>
            </div>
          </div>
        </form>

        <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
          >
            Hủy
          </button>
          <button 
            type="submit"
            form="create-edit-payment-form"
            disabled={isCreating || isUpdating}
            className={clsx(
              "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              (isCreating || isUpdating)
                ? "bg-primary/50 text-white/60 cursor-wait" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {(isCreating || isUpdating) ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEdit ? (
              <Save size={18} />
            ) : (
              <Plus size={18} />
            )}
            {isEdit ? 'Cập Nhật' : 'Tạo Phiếu Thu'}
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateEditPaymentDialog;
