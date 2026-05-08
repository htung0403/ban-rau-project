import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, GitMerge, Search, ChevronRight, Check, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useMergeCustomers, useCustomers } from '../../../hooks/queries/useCustomers';
import { matchesSearch } from '../../../lib/str-utils';
import type { Customer } from '../../../types';

type Step = 1 | 2 | 3;

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  wholesale: 'Sỉ',
  grocery: 'Tạp hóa',
  vegetable: 'Hàng rau',
  loyal: 'Khách hàng thân thiết',
};

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceCustomer: Customer;
}

const MergeCustomerDialog: React.FC<Props> = ({ isOpen, isClosing, onClose, onSuccess, sourceCustomer }) => {
  const [step, setStep] = useState<Step>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mergeMutation = useMergeCustomers();
  const navigate = useNavigate();
  const { data: allCustomers, isLoading: customersLoading } = useCustomers(
    sourceCustomer.customer_type,
    !!sourceCustomer.customer_type,
  );

  const targetCustomers = useMemo(() => {
    if (!allCustomers) return [];
    return allCustomers.filter(
      (c) =>
        c.id !== sourceCustomer.id &&
        !c.deleted_at &&
        (searchTerm
          ? matchesSearch(c.name, searchTerm) ||
            (c.phone && c.phone.includes(searchTerm)) ||
            matchesSearch(c.address || '', searchTerm)
          : true),
    );
  }, [allCustomers, sourceCustomer.id, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchTerm('');
      setSelectedTarget(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSelectTarget = (customer: Customer) => {
    setSelectedTarget(customer);
    setStep(3);
  };

  const handleConfirmMerge = async () => {
    if (!selectedTarget) return;
    setError(null);
    try {
      await mergeMutation.mutateAsync({
        source_id: sourceCustomer.id,
        target_id: selectedTarget.id,
      });
      onSuccess?.();
      navigate(selectedTarget.id);
      onClose();
    } catch {
      setError('Gộp khách hàng thất bại. Vui lòng thử lại.');
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Xác nhận khách hàng nguồn';
      case 2:
        return 'Chọn khách hàng đích';
      case 3:
        return 'Xác nhận gộp';
    }
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full max-w-[500px] bg-background shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Gộp khách hàng</h2>
              <p className="text-[12px] font-medium text-muted-foreground">{getStepTitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <React.Fragment key={s}>
                <div
                  className={clsx(
                    'flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold transition-all',
                    step >= s
                      ? 'bg-orange-600 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={clsx(
                      'flex-1 h-0.5 rounded-full transition-all',
                      step > s ? 'bg-orange-600' : 'bg-muted',
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Source Customer Info */}
          {step === 1 && (
            <>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-orange-600" />
                  <span className="text-[12px] font-bold text-orange-700/70 uppercase tracking-widest">
                    Khách hàng nguồn
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Tên</span>
                    <span className="text-[14px] font-bold text-foreground">{sourceCustomer.name}</span>
                  </div>
                  {sourceCustomer.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-muted-foreground">SĐT</span>
                      <span className="text-[14px] font-medium text-foreground">{sourceCustomer.phone}</span>
                    </div>
                  )}
                  {sourceCustomer.address && (
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-muted-foreground">Địa chỉ</span>
                      <span className="text-[14px] font-medium text-foreground">{sourceCustomer.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Loại</span>
                    <span className="text-[14px] font-medium text-foreground">
                      {CUSTOMER_TYPE_LABELS[sourceCustomer.customer_type ?? ''] ?? sourceCustomer.customer_type ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Công nợ</span>
                    <span className="text-[14px] font-bold text-red-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sourceCustomer.debt ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Tổng đơn</span>
                    <span className="text-[14px] font-medium text-foreground">{sourceCustomer.total_orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Tổng doanh thu</span>
                    <span className="text-[14px] font-medium text-foreground">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sourceCustomer.total_revenue ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[13px] text-amber-800">
                  <p className="font-bold mb-1">Lưu ý quan trọng</p>
                  <p>
                    Khách hàng nguồn sẽ bị gộp vào khách hàng đích. Tất cả đơn hàng, công nợ và dữ liệu
                    liên quan sẽ được chuyển sang khách hàng đích. Hành động này có thể hoàn tác.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Search/Select Target Customer */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">
                  Tìm khách hàng đích <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên hoặc SĐT..."
                    className="w-full pl-10 pr-4 py-3 bg-muted/5 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Chỉ hiển thị khách hàng cùng loại ({CUSTOMER_TYPE_LABELS[sourceCustomer.customer_type ?? ''] ?? sourceCustomer.customer_type ?? '—'})
                </p>
              </div>

              {customersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="w-5 h-5 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                </div>
              ) : targetCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-[13px]">
                  {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : 'Không có khách hàng cùng loại'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {targetCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectTarget(customer)}
                      className={clsx(
                        'w-full text-left p-4 rounded-xl border transition-all hover:shadow-md',
                        'bg-card border-border hover:border-orange-300 hover:bg-orange-50/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-bold text-foreground">{customer.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {customer.phone && (
                              <span className="text-[12px] text-muted-foreground">{customer.phone}</span>
                            )}
                            {customer.address && (
                              <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">
                                {customer.address}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[12px] text-muted-foreground">
                            Công nợ:{' '}
                            <span className={customer.debt > 0 ? 'text-red-600 font-bold' : 'font-medium'}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.debt ?? 0)}
                            </span>
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {customer.total_orders} đơn
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 3: Confirmation Summary */}
          {step === 3 && selectedTarget && (
            <>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                      <User size={20} className="text-red-600" />
                    </div>
                    <p className="text-[12px] font-bold text-red-600 uppercase tracking-wider mb-1">Nguồn</p>
                    <p className="text-[14px] font-bold text-foreground truncate">{sourceCustomer.name}</p>
                    {sourceCustomer.phone && (
                      <p className="text-[12px] text-muted-foreground">{sourceCustomer.phone}</p>
                    )}
                    <p className="text-[12px] text-red-600 font-bold mt-1">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sourceCustomer.debt ?? 0)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <ArrowRight size={24} className="text-orange-600" />
                    <span className="text-[10px] font-bold text-orange-600 uppercase">Gộp vào</span>
                  </div>

                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                      <User size={20} className="text-emerald-600" />
                    </div>
                    <p className="text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Đích</p>
                    <p className="text-[14px] font-bold text-foreground truncate">{selectedTarget.name}</p>
                    {selectedTarget.phone && (
                      <p className="text-[12px] text-muted-foreground">{selectedTarget.phone}</p>
                    )}
                    <p className="text-[12px] text-red-600 font-bold mt-1">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTarget.debt ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary details */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
                  <GitMerge size={16} className="text-primary" />
                  <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Chi tiết gộp</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Đơn hàng sẽ chuyển</span>
                    <span className="text-[14px] font-bold text-foreground">{sourceCustomer.total_orders} đơn</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Doanh thu sẽ chuyển</span>
                    <span className="text-[14px] font-bold text-foreground">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sourceCustomer.total_revenue ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-muted-foreground">Công nợ sẽ cộng dồn</span>
                    <span className="text-[14px] font-bold text-red-600">
                      +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sourceCustomer.debt ?? 0)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-[13px] font-bold text-foreground">Tổng công nợ sau gộp</span>
                    <span className="text-[16px] font-black text-red-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        (sourceCustomer.debt ?? 0) + (selectedTarget.debt ?? 0),
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-[13px] text-red-800">
                  <p className="font-bold mb-1">Cảnh báo</p>
                  <p>
                    Khách hàng <strong>{sourceCustomer.name}</strong> sẽ bị gộp vào <strong>{selectedTarget.name}</strong>.
                    Dữ liệu từ khách hàng nguồn sẽ được chuyển sang khách hàng đích.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[13px] text-red-700 font-medium">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) {
                    setSelectedTarget(null);
                    setStep(2);
                  } else {
                    setStep((s) => (s - 1) as Step);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Quay lại
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-[13px] font-bold shadow-lg transition-all group bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/20"
              >
                Tiếp tục
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
            )}
            {step === 3 && selectedTarget && (
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={mergeMutation.isPending}
                className={clsx(
                  'flex items-center gap-2 px-8 py-2.5 rounded-xl text-[13px] font-bold shadow-lg transition-all group',
                  mergeMutation.isPending
                    ? 'bg-red-600/50 text-white/60 cursor-wait'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20',
                )}
              >
                {mergeMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Xác nhận Gộp
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MergeCustomerDialog;